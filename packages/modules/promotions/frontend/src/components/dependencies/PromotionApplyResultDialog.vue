<script setup lang="ts">
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useCredentialTypeNames } from '../../composables/useCredentialTypeNames';
import { usePromotionDependencyLabels } from '../../composables/usePromotionDependencyLabels';
import { applyOutcome, needsFollowUp } from '../../promotionApplyOutcome';
import type { AppliedResult } from '../../promotions.types';
import PromotionDependencySection from './PromotionDependencySection.vue';

/**
 * What an Apply did for its dependencies, shown before the page leaves. A person must finish
 * some of it by hand: enter the values of an empty credential, or apply again with more rights.
 */
const props = defineProps<{
	open: boolean;
	result: AppliedResult;
	/** What the Apply wrote, in one sentence. The dialog replaces the toast, so it says it. */
	summary?: string;
	/** The names of the projects that the user can access, by id. */
	projectNames: ReadonlyMap<string, string>;
}>();

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const i18n = useI18n();
const router = useRouter();
const { credentialTypeName } = useCredentialTypeNames();
const { credentialNotMovedText, warningSentence, resourceWarningSentence } =
	usePromotionDependencyLabels();

const outcome = computed(() => applyOutcome(props.result));
const warningCount = computed(
	() => outcome.value.warnings.length + outcome.value.resourceWarnings.length,
);
/** "Sync orders, Report and 1 workflow that you cannot access". */
function liveWorkflowNames(row: {
	workflows: Array<{ name: string }>;
	hiddenWorkflowCount: number;
}) {
	const names = row.workflows.map(({ name }) => name);
	if (row.hiddenWorkflowCount > 0) {
		names.push(
			i18n.baseText('promotions.applyResult.liveEmptyCredentials.hidden', {
				adjustToNumber: row.hiddenWorkflowCount,
				interpolate: { count: String(row.hiddenWorkflowCount) },
			}),
		);
	}
	return names.join(', ');
}
const unpublished = computed(() => outcome.value.moves.filter((move) => !!move.unpublished));
const intro = computed(() =>
	i18n.baseText(
		needsFollowUp(outcome.value)
			? 'promotions.applyResult.intro'
			: 'promotions.applyResult.intro.done',
	),
);

// The credential opens in a new tab, so the result stays on this page. A new tab needs a URL.
const credentialHref = (projectId: string, credentialId: string) =>
	router.resolve({ name: VIEWS.PROJECTS_CREDENTIALS, params: { projectId, credentialId } }).href;
</script>

<template>
	<N8nDialog
		:open="open"
		size="large"
		:aria-description="intro"
		data-test-id="promotion-apply-result-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ i18n.baseText('promotions.applyResult.title') }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.body">
				<N8nText
					v-if="summary"
					tag="p"
					color="text-dark"
					:class="$style.paragraph"
					data-test-id="promotion-apply-result-summary"
				>
					{{ summary }}
				</N8nText>
				<N8nText tag="p" color="text-base" :class="$style.paragraph">{{ intro }}</N8nText>

				<N8nCallout
					v-for="move in unpublished"
					:key="`unpublished:${move.id}`"
					theme="warning"
					data-test-id="promotion-apply-result-unpublished"
				>
					{{
						i18n.baseText('promotions.applyResult.moves.unpublished', {
							interpolate: { name: move.name },
						})
					}}
				</N8nCallout>

				<N8nCallout
					v-for="live in outcome.liveWorkflowsWithEmptyCredential"
					:key="`live:${live.credential.id}`"
					theme="warning"
					data-test-id="promotion-apply-result-live-empty-credential"
				>
					{{
						i18n.baseText('promotions.applyResult.liveEmptyCredentials.row', {
							adjustToNumber: live.workflows.length + live.hiddenWorkflowCount,
							interpolate: {
								credential: live.credential.name,
								workflows: liveWorkflowNames(live),
							},
						})
					}}
				</N8nCallout>

				<PromotionDependencySection
					v-if="outcome.createdEmptyCredentials.length > 0"
					:title="
						i18n.baseText('promotions.applyResult.emptyCredentials.title', {
							adjustToNumber: outcome.createdEmptyCredentials.length,
							interpolate: { count: String(outcome.createdEmptyCredentials.length) },
						})
					"
					:description="i18n.baseText('promotions.applyResult.emptyCredentials.description')"
					icon="key-round"
					compact
					data-test-id="promotion-apply-result-empty-credentials"
				>
					<li
						v-for="emptyCredential in outcome.createdEmptyCredentials"
						:key="emptyCredential.id"
						:class="[$style.row, $style.withAction]"
					>
						<div :class="$style.main">
							<N8nText step="xs" bold color="text-dark">{{ emptyCredential.name }}</N8nText>
							<N8nText step="2xs" color="text-light">
								{{ credentialTypeName(emptyCredential.type) }}
								<template v-if="projectNames.get(emptyCredential.projectId)">
									·
									{{
										i18n.baseText('promotions.dependencies.target.inProject', {
											interpolate: { project: projectNames.get(emptyCredential.projectId) ?? '' },
										})
									}}
								</template>
							</N8nText>
						</div>
						<N8nLink
							:to="credentialHref(emptyCredential.projectId, emptyCredential.id)"
							new-window
							size="small"
							data-test-id="promotion-apply-result-open-credential"
						>
							{{ i18n.baseText('promotions.applyResult.emptyCredentials.open') }}
						</N8nLink>
					</li>
					<li :class="[$style.row, $style.note]">
						<N8nIcon icon="info" size="small" />
						<N8nText step="2xs" color="text-base">
							{{ i18n.baseText('promotions.dependencies.confirm.effect.notPublished') }}
							{{ i18n.baseText('promotions.applyResult.emptyCredentials.publish') }}
						</N8nText>
					</li>
				</PromotionDependencySection>

				<PromotionDependencySection
					v-if="outcome.credentialsNotMoved.length > 0"
					:title="i18n.baseText('promotions.applyResult.notMoved.title')"
					icon="triangle-alert"
					compact
					data-test-id="promotion-apply-result-not-moved"
				>
					<li
						v-for="move in outcome.credentialsNotMoved"
						:key="move.credential.id"
						:class="$style.row"
					>
						<N8nText step="xs" color="text-dark">{{ credentialNotMovedText(move) }}</N8nText>
					</li>
				</PromotionDependencySection>

				<PromotionDependencySection
					v-if="outcome.grants.length > 0"
					:title="i18n.baseText('promotions.applyResult.grants.title')"
					compact
					data-test-id="promotion-apply-result-grants"
				>
					<li v-for="grant in outcome.grants" :key="grant.id" :class="$style.row">
						<N8nText step="xs" color="text-dark">
							{{
								i18n.baseText('promotions.applyResult.grants.row', {
									interpolate: { project: grant.project.name, credential: grant.credential.name },
								})
							}}
						</N8nText>
					</li>
				</PromotionDependencySection>

				<PromotionDependencySection
					v-if="outcome.credentialsMoved.length > 0 || outcome.moves.length > 0"
					:title="i18n.baseText('promotions.applyResult.moved.title')"
					compact
					data-test-id="promotion-apply-result-moved"
				>
					<li
						v-for="move in outcome.credentialsMoved"
						:key="move.credential.id"
						:class="[$style.row, { [$style.withAction]: move.empty }]"
					>
						<div :class="$style.main">
							<N8nText step="xs" color="text-dark">
								{{
									i18n.baseText('promotions.applyResult.credentials.moved', {
										interpolate: { credential: move.credential.name, project: move.toProject.name },
									})
								}}
							</N8nText>
							<!-- The move keeps the marker: the credential still has no values. -->
							<N8nText v-if="move.empty" step="2xs" color="text-light">
								{{ i18n.baseText('promotions.applyResult.credentials.stillEmpty') }}
							</N8nText>
						</div>
						<N8nLink
							v-if="move.empty"
							:to="credentialHref(move.toProject.id, move.credential.id)"
							new-window
							size="small"
							data-test-id="promotion-apply-result-open-moved-credential"
						>
							{{ i18n.baseText('promotions.applyResult.emptyCredentials.open') }}
						</N8nLink>
					</li>
					<li v-for="move in outcome.moves" :key="`${move.kind}:${move.id}`" :class="$style.row">
						<N8nText step="xs" color="text-dark">
							{{
								i18n.baseText('promotions.applyResult.moves.row', {
									interpolate: {
										name: move.name,
										project:
											move.toProject.name ?? i18n.baseText('promotions.preview.anotherProject'),
									},
								})
							}}
						</N8nText>
					</li>
				</PromotionDependencySection>

				<PromotionDependencySection
					v-if="outcome.keptWorkflows.length > 0"
					:title="i18n.baseText('promotions.dependencies.kept.title')"
					:description="i18n.baseText('promotions.applyResult.kept.description')"
					compact
					data-test-id="promotion-apply-result-kept"
				>
					<li v-for="workflow in outcome.keptWorkflows" :key="workflow.id" :class="$style.row">
						<N8nText step="xs" color="text-dark">
							{{
								i18n.baseText('promotions.applyResult.kept.row', {
									interpolate: {
										name: workflow.name,
										callers: workflow.referencedBy.map(({ name }) => name).join(', '),
									},
								})
							}}
						</N8nText>
					</li>
				</PromotionDependencySection>

				<PromotionDependencySection
					v-if="outcome.keptProjects.length > 0"
					:title="i18n.baseText('promotions.dependencies.keptProjects.title')"
					:description="i18n.baseText('promotions.applyResult.keptProjects.description')"
					compact
					data-test-id="promotion-apply-result-kept-projects"
				>
					<li v-for="kept in outcome.keptProjects" :key="kept.project.id" :class="$style.row">
						<N8nText step="xs" color="text-dark">
							{{
								i18n.baseText('promotions.dependencies.keptProjects.row', {
									interpolate: {
										project: kept.project.name,
										credentials: kept.credentials.map(({ name }) => name).join(', '),
									},
								})
							}}
						</N8nText>
					</li>
				</PromotionDependencySection>

				<PromotionDependencySection
					v-if="warningCount > 0"
					:title="
						i18n.baseText('promotions.dependencies.warnings.title', {
							adjustToNumber: warningCount,
							interpolate: { count: String(warningCount) },
						})
					"
					:description="i18n.baseText('promotions.applyResult.warnings.description')"
					icon="triangle-alert"
					compact
					data-test-id="promotion-apply-result-warnings"
				>
					<li v-for="warning in outcome.warnings" :key="warning.id" :class="$style.row">
						<N8nText step="xs" color="text-dark">{{ warningSentence(warning) }}</N8nText>
					</li>
					<li
						v-for="(warning, index) in outcome.resourceWarnings"
						:key="`resource:${index}`"
						:class="$style.row"
						data-test-id="promotion-apply-result-resource-warning"
					>
						<N8nText step="xs" color="text-dark">{{ resourceWarningSentence(warning) }}</N8nText>
					</li>
				</PromotionDependencySection>

				<N8nText
					v-if="outcome.unresolvedCount > 0"
					tag="p"
					step="xs"
					color="text-base"
					:class="$style.paragraph"
					data-test-id="promotion-apply-result-unresolved"
				>
					{{
						i18n.baseText('promotions.dependencies.confirm.effect.unresolved', {
							adjustToNumber: outcome.unresolvedCount,
							interpolate: { count: String(outcome.unresolvedCount) },
						})
					}}
				</N8nText>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				data-test-id="promotion-apply-result-done"
				@click="emit('update:open', false)"
			>
				{{ i18n.baseText('promotions.applyResult.done') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.paragraph {
	margin: 0;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);

	&:not(:first-child) {
		border-top: var(--border);
	}
}

.withAction {
	justify-content: space-between;

	// The action stays on one line next to a long sentence.
	> a {
		flex-shrink: 0;
		white-space: nowrap;
	}
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.note {
	gap: var(--spacing--2xs);
}
</style>
