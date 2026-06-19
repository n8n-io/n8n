<script lang="ts" setup>
import type { PromotionBlockingIssue, PromotionWorkflowPlanItem } from '@n8n/api-types';
import PromotionWorkflowDiffInline from './PromotionWorkflowDiffInline.vue';
import { usePromotionReviewStore } from '../promotionReview.store';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';

const store = usePromotionReviewStore();
const { plan, credentialBindings, isPlanning, planError, selectedProjectId, importableProjects } =
	storeToRefs(store);
const i18n = useI18n();

const credentialBlockers = computed(() =>
	(plan.value?.blockingIssues ?? []).filter(
		(issue): issue is Extract<PromotionBlockingIssue, { type: 'credential-unresolved' }> =>
			issue.type === 'credential-unresolved',
	),
);

function actionTheme(action: PromotionWorkflowPlanItem['action']) {
	switch (action) {
		case 'create':
			return 'success';
		case 'update':
			return 'warning';
		default:
			return 'default';
	}
}

function actionLabel(action: PromotionWorkflowPlanItem['action']) {
	return i18n.baseText(`promotionReview.plan.action.${action}`);
}

function blockerMessage(issue: Extract<PromotionBlockingIssue, { type: 'credential-unresolved' }>) {
	if (issue.kind === 'type_mismatch') {
		return i18n.baseText('promotionReview.plan.blocker.typeMismatch', {
			interpolate: {
				expected: issue.expectedType ?? '',
				actual: issue.actualType ?? '',
			},
		});
	}
	return i18n.baseText('promotionReview.plan.blocker.notFound');
}

function credentialsForType(type: string) {
	return store.usableCredentials.filter((c) => c.type === type);
}

const showWorkflowDiff = ref(false);

watch(
	() => plan.value?.workflowDiffs,
	(workflowDiffs) => {
		showWorkflowDiff.value = false;
		if (!workflowDiffs?.length) return;
		void nextTick(() => {
			showWorkflowDiff.value = true;
		});
	},
);

const emit = defineEmits<{
	approve: [];
	reject: [];
}>();
</script>

<template>
	<div :class="$style.root" data-test-id="promotion-review-panel">
		<N8nText v-if="isPlanning" color="text-light" size="small">
			{{ i18n.baseText('genericHelpers.loading') }}
		</N8nText>

		<N8nCallout v-else-if="planError" theme="danger" data-test-id="promotion-review-plan-error">
			{{ planError }}
		</N8nCallout>

		<template v-else-if="plan">
			<div :class="$style.header">
				<div :class="$style.headerMain">
					<N8nIcon icon="git-branch" size="large" :class="$style.headerIcon" />
					<div>
						<N8nHeading tag="h2" size="medium">
							{{ i18n.baseText('promotionReview.plan.title') }}
						</N8nHeading>
						<N8nText color="text-light" size="small">
							{{
								i18n.baseText('promotionReview.plan.subtitle', {
									interpolate: {
										instance: plan.package.sourceInstanceName,
										branch: plan.package.sourceBranch,
									},
								})
							}}
						</N8nText>
					</div>
				</div>
				<N8nBadge v-if="plan.canApply" theme="success" size="small">
					{{ i18n.baseText('promotionReview.plan.readyToApply') }}
				</N8nBadge>
				<N8nBadge v-else theme="warning" size="small">
					{{ i18n.baseText('promotionReview.plan.blocked') }}
				</N8nBadge>
			</div>

			<section :class="$style.section">
				<N8nHeading tag="h3" size="small" :class="$style.sectionTitle">
					{{ i18n.baseText('promotionReview.plan.targetProject') }}
				</N8nHeading>
				<N8nSelect
					:model-value="selectedProjectId ?? ''"
					:placeholder="i18n.baseText('promotionReview.plan.selectProject')"
					:class="$style.projectSelect"
					@update:model-value="(value: string) => store.setProjectId(value)"
				>
					<N8nOption
						v-for="project in importableProjects"
						:key="project.id"
						:label="project.name"
						:value="project.id"
					/>
				</N8nSelect>
			</section>

			<N8nCallout v-if="!plan.canApply" theme="warning" :class="$style.callout">
				{{ i18n.baseText('promotionReview.plan.blockedHint') }}
			</N8nCallout>

			<section :class="$style.section">
				<N8nHeading tag="h3" size="small" :class="$style.sectionTitle">
					{{ i18n.baseText('promotionReview.plan.workflows') }}
				</N8nHeading>
				<div
					v-for="workflow in plan.workflows"
					:key="workflow.sourceWorkflowId"
					:class="$style.workflowCard"
				>
					<div :class="$style.workflowHeader">
						<N8nText bold>{{ workflow.name }}</N8nText>
						<N8nBadge :theme="actionTheme(workflow.action)" size="small">
							{{ actionLabel(workflow.action) }}
						</N8nBadge>
					</div>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('promotionReview.plan.workflowAction', {
								interpolate: { action: actionLabel(workflow.action) },
							})
						}}
					</N8nText>
					<N8nText v-if="workflow.sourcePublished" size="small" color="success" bold>
						{{ i18n.baseText('promotionReview.plan.willPublish') }}
					</N8nText>
				</div>
			</section>

			<section v-if="showWorkflowDiff && plan.workflowDiffs?.length" :class="$style.section">
				<N8nHeading tag="h3" size="small" :class="$style.sectionTitle">
					{{ i18n.baseText('promotionReview.plan.workflowDiff') }}
				</N8nHeading>
				<div
					v-for="workflowDiff in plan.workflowDiffs"
					:key="workflowDiff.sourceWorkflowId"
					:class="$style.diffCard"
				>
					<N8nText bold :class="$style.diffTitle">{{ workflowDiff.name }}</N8nText>
					<div :class="$style.diffContainer">
						<PromotionWorkflowDiffInline :workflow-diff="workflowDiff" />
					</div>
				</div>
			</section>

			<section :class="$style.section">
				<N8nHeading tag="h3" size="small" :class="$style.sectionTitle">
					{{ i18n.baseText('promotionReview.plan.credentials') }}
				</N8nHeading>
				<div
					v-for="requirement in plan.credentialRequirements"
					:key="requirement.id"
					:class="$style.credentialCard"
				>
					<div :class="$style.credentialHeader">
						<div>
							<N8nText bold>{{ requirement.name }}</N8nText>
							<N8nText size="small" color="text-light">
								{{
									i18n.baseText('promotionReview.plan.credentialType', {
										interpolate: { type: requirement.type },
									})
								}}
							</N8nText>
						</div>
						<N8nBadge
							:theme="credentialBindings[requirement.id] ? 'success' : 'danger'"
							size="small"
						>
							{{
								credentialBindings[requirement.id]
									? i18n.baseText('promotionReview.plan.mapped')
									: i18n.baseText('promotionReview.plan.unmapped')
							}}
						</N8nBadge>
					</div>

					<N8nSelect
						:model-value="credentialBindings[requirement.id] ?? ''"
						:placeholder="i18n.baseText('promotionReview.plan.selectCredential')"
						:class="$style.credentialSelect"
						@update:model-value="
							(value: string) => store.setCredentialBinding(requirement.id, value)
						"
					>
						<N8nOption
							v-for="credential in credentialsForType(requirement.type)"
							:key="credential.id"
							:label="credential.name"
							:value="credential.id"
						/>
					</N8nSelect>

					<N8nText
						v-for="blocker in credentialBlockers.filter((b) => b.sourceId === requirement.id)"
						:key="blocker.sourceId + blocker.kind"
						size="small"
						color="danger"
					>
						{{ blockerMessage(blocker) }}
					</N8nText>
				</div>
			</section>

			<section :class="$style.section">
				<N8nHeading tag="h3" size="small" :class="$style.sectionTitle">
					{{ i18n.baseText('promotionReview.plan.importEngine') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('promotionReview.plan.engineNote') }}
				</N8nText>
			</section>

			<div :class="$style.footer">
				<N8nButton variant="subtle" data-test-id="promotion-review-reject" @click="emit('reject')">
					{{ i18n.baseText('promotionReview.plan.reject') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!plan.canApply || isPlanning"
					data-test-id="promotion-review-approve"
					@click="emit('approve')"
				>
					{{ i18n.baseText('promotionReview.plan.approve') }}
				</N8nButton>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.headerMain {
	display: flex;
	gap: var(--spacing--sm);
	align-items: flex-start;
}

.headerIcon {
	color: var(--color--primary);
	margin-top: var(--spacing--4xs);
}

.callout {
	margin: 0;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.sectionTitle {
	margin: 0;
}

.workflowCard,
.credentialCard,
.diffCard {
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--foreground);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.diffTitle {
	margin-bottom: var(--spacing--2xs);
}

.diffContainer {
	height: 560px;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
	background: var(--color--background);
}

.workflowHeader,
.credentialHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.credentialSelect {
	max-width: 360px;
}

.projectSelect {
	max-width: 360px;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}
</style>
