<script lang="ts" setup>
import { MIGRATE_WORKFLOW_MODAL_KEY } from '@/app/constants';
import type {
	BreakingChangeAssistantAction,
	BreakingChangeRecommendation,
	BreakingChangeWorkflowRuleResult,
	WorkflowMigrationResult,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { ResponseError } from '@n8n/rest-api-client';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@n8n/composables/useToast';
import type { EventBus } from '@n8n/utils/event-bus';
import { computed, ref } from 'vue';
import { useMigrationFindingAssistant } from './useMigrationFindingAssistant';

defineOptions({ inheritAttrs: false });

type AffectedWorkflow = BreakingChangeWorkflowRuleResult['affectedWorkflows'][number];

const props = defineProps<{
	modalName: string;
	data: {
		ruleId: string;
		ruleTitle: string;
		assistantAction: BreakingChangeAssistantAction;
		// One workflow, or the rows the user selected for a bulk migration.
		workflows: AffectedWorkflow[];
		// The rule's recommendations, shown as the concrete "what will change" detail.
		recommendations: BreakingChangeRecommendation[];
		// Emitted back to the report so the row can reflect the migrated state.
		eventBus: EventBus;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[MIGRATE_WORKFLOW_MODAL_KEY]?.open === true);

const workflows = computed(() => props.data.workflows);
const isBulk = computed(() => workflows.value.length > 1);

// The failure message, plus the node a migration refused (so the error state can link to it).
type MigrationError = { message: string; node?: { id: string; name: string } };
type MigrationOutcome =
	| { workflow: AffectedWorkflow; result: WorkflowMigrationResult }
	| { workflow: AffectedWorkflow; error: MigrationError };
type MigrationSuccess = Extract<MigrationOutcome, { result: WorkflowMigrationResult }>;
type MigrationFailure = Extract<MigrationOutcome, { error: MigrationError }>;

type Phase = 'confirm' | 'result';
const phase = ref<Phase>('confirm');
const migrating = ref(false);
const outcomes = ref<MigrationOutcome[]>([]);
const publishing = ref(false);
const publishedWorkflowIds = ref<Set<string>>(new Set());

const succeeded = computed(() =>
	outcomes.value.filter((outcome): outcome is MigrationSuccess => 'result' in outcome),
);
const failed = computed(() =>
	outcomes.value.filter((outcome): outcome is MigrationFailure => 'error' in outcome),
);
const toPublish = computed(() =>
	succeeded.value.filter(
		(outcome) =>
			outcome.result.republishable && !publishedWorkflowIds.value.has(outcome.workflow.id),
	),
);

const title = computed(() =>
	isBulk.value
		? i18n.baseText('settings.migrationReport.detail.migrate.modal.bulkTitle', {
				interpolate: { count: String(workflows.value.length) },
			})
		: i18n.baseText('settings.migrationReport.detail.migrate.modal.title', {
				interpolate: { name: workflows.value[0].name },
			}),
);

const confirmLabel = computed(() => {
	if (!isBulk.value) {
		return i18n.baseText('settings.migrationReport.detail.migrate.modal.confirmButton');
	}
	const total = String(workflows.value.length);
	return migrating.value
		? i18n.baseText('settings.migrationReport.detail.migrate.modal.bulkProgress', {
				interpolate: { done: String(outcomes.value.length), total },
			})
		: i18n.baseText('settings.migrationReport.detail.migrate.modal.bulkConfirmButton', {
				interpolate: { count: total },
			});
});

// Names of the migrated nodes, resolved from the report's issues, for review links.
function migratedNodes({ workflow, result }: MigrationSuccess) {
	return result.migratedNodeIds.map((id) => ({
		id,
		name: workflow.issues.find((issue) => issue.nodeId === id)?.nodeName ?? id,
	}));
}

function warnings({ result }: MigrationSuccess) {
	return [...result.notes, ...result.unmapped];
}

function toMigrationError(e: unknown): MigrationError {
	// A migration that refuses a specific node tells us which one — surface it so
	// the user can jump straight there.
	const meta = e instanceof ResponseError ? e.meta : undefined;
	return {
		message: e instanceof Error ? e.message : String(e),
		node:
			typeof meta?.nodeId === 'string'
				? {
						id: meta.nodeId,
						name: typeof meta.nodeName === 'string' ? meta.nodeName : meta.nodeId,
					}
				: undefined,
	};
}

// One workflow at a time: each migration saves a new version, and a failure
// must not stop the rest.
async function handleMigrate() {
	migrating.value = true;
	try {
		for (const workflow of workflows.value) {
			try {
				const result = await breakingChangesApi.migrateWorkflowForRule(
					useRootStore().restApiContext,
					props.data.ruleId,
					workflow.id,
				);
				outcomes.value = [...outcomes.value, { workflow, result }];
				props.data.eventBus.emit('migrated', { workflowId: workflow.id });
			} catch (e) {
				outcomes.value = [...outcomes.value, { workflow, error: toMigrationError(e) }];
			}
		}
		phase.value = 'result';
	} finally {
		migrating.value = false;
	}
}

async function handlePublish() {
	publishing.value = true;
	try {
		for (const { workflow, result } of toPublish.value) {
			try {
				await workflowsStore.publishWorkflow(workflow.id, { versionId: result.newVersionId });
				publishedWorkflowIds.value = new Set(publishedWorkflowIds.value).add(workflow.id);
			} catch (e) {
				toast.showError(
					e,
					i18n.baseText('settings.migrationReport.detail.migrate.publish.error.title'),
				);
			}
		}
	} finally {
		publishing.value = false;
	}
}

// A refused or partial migration can continue in n8n Assistant, which gets what the
// migration left so it does not replace the nodes again.
const findingAssistant = useMigrationFindingAssistant();
const canContinueInAssistant = computed(
	() => findingAssistant.available.value && props.data.assistantAction !== 'none',
);

function continueInAssistant(outcome: MigrationOutcome) {
	void findingAssistant.open({
		rule: props.data,
		workflow: outcome.workflow,
		automatedMigration:
			'error' in outcome
				? { outcome: 'refused', message: outcome.error.message, nodeName: outcome.error.node?.name }
				: { outcome: 'partial', notes: outcome.result.notes, unmapped: outcome.result.unmapped },
	});
}

function closeDialog() {
	if (uiStore.modalsById[MIGRATE_WORKFLOW_MODAL_KEY]?.open !== true) return;
	uiStore.closeModal(MIGRATE_WORKFLOW_MODAL_KEY);
	props.data.eventBus.emit('closed');
}

function onDialogOpenUpdate(open: boolean) {
	// A migration in progress must finish. Escape and the overlay stay ignored until it does.
	if (!open && !migrating.value) closeDialog();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="large"
		:close-on-overlay-click="false"
		:close-on-escape="!migrating"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.content" :data-test-id="`${MIGRATE_WORKFLOW_MODAL_KEY}-modal`">
				<!-- Confirmation -->
				<template v-if="phase === 'confirm'">
					<div v-if="data.recommendations.length" :class="$style.section">
						<N8nText color="text-dark">
							{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.confirmLead') }}
						</N8nText>
						<ul :class="$style.changeList">
							<li v-for="(rec, index) in data.recommendations" :key="index" :class="$style.change">
								<N8nText size="small" color="text-dark">{{ rec.action }}</N8nText>
								<N8nText size="small" color="text-base">{{ rec.description }}</N8nText>
							</li>
						</ul>
					</div>

					<!-- Migrate and publish are two separate steps; make that explicit so users
						 don't assume migrating changes the live version. -->
					<N8nCallout theme="info">
						<div>
							{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.stepMigrate') }}
						</div>
						<div>
							{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.stepPublish') }}
						</div>
					</N8nCallout>
				</template>

				<!-- Result -->
				<template v-else>
					<N8nCallout v-if="succeeded.length" theme="success" icon="circle-check">
						<template v-if="isBulk">
							{{
								i18n.baseText('settings.migrationReport.detail.migrate.modal.bulkSuccessBody', {
									adjustToNumber: succeeded.length,
									interpolate: { count: String(succeeded.length) },
								})
							}}
							<ul :class="$style.workflowList">
								<li v-for="{ workflow } in succeeded" :key="workflow.id">
									<N8nLink :to="`/workflow/${workflow.id}`" new-window size="small">
										{{ workflow.name }}
									</N8nLink>
								</li>
							</ul>
						</template>
						<template v-else>
							{{
								i18n.baseText('settings.migrationReport.detail.migrate.modal.successBody', {
									interpolate: { name: succeeded[0].workflow.name },
								})
							}}
							<N8nLink :to="`/workflow/${succeeded[0].workflow.id}`" new-window size="small">
								{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.openWorkflow') }}
							</N8nLink>
						</template>
					</N8nCallout>

					<!-- Behaviour changes the user should review -->
					<template v-for="outcome in succeeded" :key="outcome.workflow.id">
						<N8nCallout v-if="warnings(outcome).length" theme="warning">
							<div :class="$style.reviewTitle">
								{{
									isBulk
										? i18n.baseText(
												'settings.migrationReport.detail.migrate.modal.bulkReviewTitle',
												{
													interpolate: { name: outcome.workflow.name },
												},
											)
										: i18n.baseText('settings.migrationReport.detail.migrate.modal.reviewTitle')
								}}
							</div>
							<ul :class="$style.warningList">
								<li v-for="(warning, index) in warnings(outcome)" :key="index">{{ warning }}</li>
							</ul>
							<div :class="$style.reviewNodes">
								{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.reviewNodes') }}
								<template v-for="(node, index) in migratedNodes(outcome)" :key="node.id">
									<N8nLink
										:to="`/workflow/${outcome.workflow.id}/${node.id}`"
										new-window
										size="small"
										>{{ node.name }}</N8nLink
									><template v-if="index < outcome.result.migratedNodeIds.length - 1">, </template>
								</template>
							</div>
							<N8nButton
								v-if="canContinueInAssistant"
								variant="outline"
								size="small"
								:class="$style.assistantButton"
								:label="
									i18n.baseText('settings.migrationReport.detail.migrate.modal.continueInAssistant')
								"
								data-test-id="migrate-modal-continue-in-assistant-button"
								@click="continueInAssistant(outcome)"
							/>
						</N8nCallout>
					</template>

					<N8nCallout
						v-for="{ workflow, error } in failed"
						:key="workflow.id"
						theme="danger"
						icon="status-error"
					>
						<div v-if="isBulk" :class="$style.reviewTitle">
							{{
								i18n.baseText('settings.migrationReport.detail.migrate.modal.bulkErrorTitle', {
									interpolate: { name: workflow.name },
								})
							}}
						</div>
						{{ error.message }}
						<template v-if="error.node">
							<br />
							<N8nLink :to="`/workflow/${workflow.id}/${error.node.id}`" new-window size="small">{{
								error.node.name
							}}</N8nLink>
						</template>
						<N8nButton
							v-if="canContinueInAssistant"
							variant="outline"
							size="small"
							:class="$style.assistantButton"
							:label="
								i18n.baseText('settings.migrationReport.detail.migrate.modal.continueInAssistant')
							"
							data-test-id="migrate-modal-continue-in-assistant-button"
							@click="continueInAssistant({ workflow, error })"
						/>
					</N8nCallout>

					<N8nText v-if="publishedWorkflowIds.size" size="small" color="success">
						{{
							isBulk
								? i18n.baseText('settings.migrationReport.detail.migrate.publish.bulkPublished', {
										adjustToNumber: publishedWorkflowIds.size,
										interpolate: { count: String(publishedWorkflowIds.size) },
									})
								: i18n.baseText('settings.migrationReport.detail.migrate.publish.published')
						}}
					</N8nText>
				</template>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.actions">
				<template v-if="phase === 'confirm'">
					<N8nButton
						variant="outline"
						:disabled="migrating"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="migrate-modal-cancel-button"
						@click="closeDialog"
					/>
					<!-- A loading button hides its label, so a bulk run only disables it to keep the progress visible. -->
					<N8nButton
						:loading="migrating && !isBulk"
						:disabled="migrating"
						:label="confirmLabel"
						data-test-id="migrate-modal-confirm-button"
						@click="handleMigrate"
					/>
				</template>
				<template v-else-if="toPublish.length">
					<N8nButton
						variant="outline"
						:disabled="publishing"
						:label="i18n.baseText('settings.migrationReport.detail.migrate.publish.skip')"
						data-test-id="migrate-modal-skip-publish-button"
						@click="closeDialog"
					/>
					<N8nButton
						:loading="publishing"
						:label="
							isBulk
								? i18n.baseText('settings.migrationReport.detail.migrate.publish.bulkButton', {
										adjustToNumber: toPublish.length,
										interpolate: { count: String(toPublish.length) },
									})
								: i18n.baseText('settings.migrationReport.detail.migrate.publish.button')
						"
						data-test-id="migrate-modal-publish-button"
						@click="handlePublish"
					/>
				</template>
				<N8nButton
					v-else-if="succeeded.length"
					variant="outline"
					:label="i18n.baseText('settings.migrationReport.detail.migrate.modal.done')"
					data-test-id="migrate-modal-done-button"
					@click="closeDialog"
				/>
				<N8nButton
					v-else
					variant="outline"
					:label="i18n.baseText('generic.close')"
					data-test-id="migrate-modal-close-button"
					@click="closeDialog"
				/>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.changeList {
	list-style-type: disc;
	padding-left: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.change {
	display: flex;
	flex-direction: column;
}

.reviewTitle {
	font-weight: var(--font-weight--medium);
	margin-bottom: var(--spacing--3xs);
}

.workflowList {
	list-style-type: disc;
	padding-left: var(--spacing--sm);
	margin-top: var(--spacing--3xs);
}

.warningList {
	list-style-type: disc;
	padding-left: var(--spacing--sm);
	margin-bottom: var(--spacing--3xs);
}

.reviewNodes {
	margin-top: var(--spacing--3xs);
}

.assistantButton {
	display: flex;
	margin-top: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
