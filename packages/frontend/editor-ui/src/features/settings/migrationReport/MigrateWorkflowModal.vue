<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import { MIGRATE_WORKFLOW_MODAL_KEY } from '@/app/constants';
import type {
	BreakingChangeRecommendation,
	BreakingChangeWorkflowRuleResult,
	WorkflowMigrationResult,
} from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nHeading, N8nLink, N8nText } from '@n8n/design-system';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { ResponseError } from '@n8n/rest-api-client';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useToast } from '@/app/composables/useToast';
import type { EventBus } from '@n8n/utils/event-bus';
import { computed, ref } from 'vue';

type AffectedWorkflow = BreakingChangeWorkflowRuleResult['affectedWorkflows'][number];

const props = defineProps<{
	modalName: string;
	data: {
		ruleId: string;
		workflow: AffectedWorkflow;
		// The rule's recommendations, shown as the concrete "what will change" detail.
		recommendations: BreakingChangeRecommendation[];
		// Emitted back to the report so the row can reflect the migrated state.
		eventBus: EventBus;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const workflowsStore = useWorkflowsStore();

const workflow = computed(() => props.data.workflow);

type Phase = 'confirm' | 'success' | 'error';
const phase = ref<Phase>('confirm');
const migrating = ref(false);
const result = ref<WorkflowMigrationResult | null>(null);
// The failure message, plus the node a migration refused (so the error state can link to it).
const error = ref<{ message: string; node?: { id: string; name: string } } | null>(null);
const publishing = ref(false);
const published = ref(false);

// Names of the migrated nodes, resolved from the report's issues, for review links.
const migratedNodes = computed(() =>
	(result.value?.migratedNodeIds ?? []).map((id) => ({
		id,
		name: workflow.value.issues.find((issue) => issue.nodeId === id)?.nodeName ?? id,
	})),
);

const warnings = computed(() => [
	...(result.value?.notes ?? []),
	...(result.value?.unmapped ?? []),
]);

async function handleMigrate() {
	migrating.value = true;
	try {
		result.value = await breakingChangesApi.migrateWorkflowForRule(
			useRootStore().restApiContext,
			props.data.ruleId,
			workflow.value.id,
		);
		props.data.eventBus.emit('migrated', { workflowId: workflow.value.id });
		phase.value = 'success';
	} catch (e) {
		// A migration that refuses a specific node tells us which one — surface it so
		// the user can jump straight there.
		const meta = e instanceof ResponseError ? e.meta : undefined;
		error.value = {
			message: e instanceof Error ? e.message : String(e),
			node:
				typeof meta?.nodeId === 'string'
					? {
							id: meta.nodeId,
							name: typeof meta.nodeName === 'string' ? meta.nodeName : meta.nodeId,
						}
					: undefined,
		};
		phase.value = 'error';
	} finally {
		migrating.value = false;
	}
}

async function handlePublish() {
	if (!result.value) return;
	publishing.value = true;
	try {
		await workflowsStore.publishWorkflow(workflow.value.id, {
			versionId: result.value.newVersionId,
		});
		published.value = true;
	} catch (e) {
		toast.showError(
			e,
			i18n.baseText('settings.migrationReport.detail.migrate.publish.error.title'),
		);
	} finally {
		publishing.value = false;
	}
}

function close() {
	props.data.eventBus.emit('close');
}
</script>

<template>
	<Modal
		:name="MIGRATE_WORKFLOW_MODAL_KEY"
		:event-bus="data.eventBus"
		:center="true"
		:close-on-click-modal="false"
		width="540px"
	>
		<template #header>
			<N8nHeading size="xlarge">
				{{
					i18n.baseText('settings.migrationReport.detail.migrate.modal.title', {
						interpolate: { name: workflow.name },
					})
				}}
			</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
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

				<!-- Success -->
				<template v-else-if="phase === 'success' && result">
					<N8nCallout theme="success" icon="circle-check">
						{{
							i18n.baseText('settings.migrationReport.detail.migrate.modal.successBody', {
								interpolate: { name: workflow.name },
							})
						}}
						<N8nLink :to="`/workflow/${workflow.id}`" new-window size="small">
							{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.openWorkflow') }}
						</N8nLink>
					</N8nCallout>

					<!-- Behaviour changes the user should review -->
					<N8nCallout v-if="warnings.length" theme="warning">
						<div :class="$style.reviewTitle">
							{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.reviewTitle') }}
						</div>
						<ul :class="$style.warningList">
							<li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
						</ul>
						<div :class="$style.reviewNodes">
							{{ i18n.baseText('settings.migrationReport.detail.migrate.modal.reviewNodes') }}
							<template v-for="(node, index) in migratedNodes" :key="node.id">
								<N8nLink :to="`/workflow/${workflow.id}/${node.id}`" new-window size="small">{{
									node.name
								}}</N8nLink
								><template v-if="index < migratedNodes.length - 1">, </template>
							</template>
						</div>
					</N8nCallout>

					<N8nText v-if="published" size="small" color="success">
						{{ i18n.baseText('settings.migrationReport.detail.migrate.publish.published') }}
					</N8nText>
				</template>

				<!-- Error -->
				<template v-else-if="phase === 'error' && error">
					<N8nCallout theme="danger" icon="status-error">
						{{ error.message }}
						<template v-if="error.node">
							<br />
							<N8nLink :to="`/workflow/${workflow.id}/${error.node.id}`" new-window size="small">{{
								error.node.name
							}}</N8nLink>
						</template>
					</N8nCallout>
				</template>
			</div>
		</template>
		<template #footer>
			<div :class="$style.actions">
				<template v-if="phase === 'confirm'">
					<N8nButton
						variant="subtle"
						:disabled="migrating"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="migrate-modal-cancel-button"
						@click="close"
					/>
					<N8nButton
						:loading="migrating"
						:label="i18n.baseText('settings.migrationReport.detail.migrate.modal.confirmButton')"
						data-test-id="migrate-modal-confirm-button"
						@click="handleMigrate"
					/>
				</template>
				<template v-else-if="phase === 'success'">
					<template v-if="result?.republishable && !published">
						<N8nButton
							variant="subtle"
							:disabled="publishing"
							:label="i18n.baseText('settings.migrationReport.detail.migrate.publish.skip')"
							data-test-id="migrate-modal-skip-publish-button"
							@click="close"
						/>
						<N8nButton
							:loading="publishing"
							:label="i18n.baseText('settings.migrationReport.detail.migrate.publish.button')"
							data-test-id="migrate-modal-publish-button"
							@click="handlePublish"
						/>
					</template>
					<N8nButton
						v-else
						variant="subtle"
						:label="i18n.baseText('settings.migrationReport.detail.migrate.modal.done')"
						data-test-id="migrate-modal-done-button"
						@click="close"
					/>
				</template>
				<template v-else>
					<N8nButton
						variant="subtle"
						:label="i18n.baseText('generic.close')"
						data-test-id="migrate-modal-close-button"
						@click="close"
					/>
				</template>
			</div>
		</template>
	</Modal>
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
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--3xs);
}

.warningList {
	list-style-type: disc;
	padding-left: var(--spacing--sm);
	margin-bottom: var(--spacing--3xs);
}

.reviewNodes {
	margin-top: var(--spacing--3xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
