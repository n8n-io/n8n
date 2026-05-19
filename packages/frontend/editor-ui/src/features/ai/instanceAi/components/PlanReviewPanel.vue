<script lang="ts" setup>
/**
 * PlanReviewPanel.vue
 *
 * Single-card plan approval UI. Shows generated artifacts and exposes approve
 * / edit-request controls.
 */
import { N8nButton, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';
import ConfirmationFooter from './ConfirmationFooter.vue';

export interface PlannedTaskArg {
	id: string;
	title: string;
	kind: string;
	spec: string;
	deps: string[];
	tools?: string[];
	workflowId?: string;
}

export type PlanReviewStatus = 'pending' | 'approved' | 'changes-requested';
type PlanArtifact = {
	id: string;
	title: string;
	description: string;
	icon: 'workflow' | 'table';
};
type PlanItem = {
	id: string;
	title: string;
	description: string;
	icon: IconName;
};

const props = defineProps<{
	plannedTasks: PlannedTaskArg[];
	message?: string;
	disabled?: boolean;
	readOnly?: boolean;
	loading?: boolean;
	status?: PlanReviewStatus;
	updating?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{
	approve: [];
	'request-changes': [];
}>();

const isResolved = ref(false);
const resolvedAction = ref<PlanReviewStatus | null>(null);

type SectionKey = 'workflows' | 'dataTables' | 'research' | 'checks' | 'tasks';

const SECTION_CONFIG: Array<{
	key: SectionKey;
	kinds: string[];
}> = [
	{
		key: 'workflows',
		kinds: ['build-workflow', 'workflow'],
	},
	{
		key: 'dataTables',
		kinds: ['manage-data-tables', 'data-table'],
	},
	{
		key: 'research',
		kinds: ['research'],
	},
	{
		key: 'checks',
		kinds: ['checkpoint'],
	},
	{
		key: 'tasks',
		kinds: [],
	},
];

const plannedTasks = computed(() => {
	const seen = new Set<string>();
	return props.plannedTasks.filter((task) => {
		const key = task.title.trim().toLowerCase() || task.id;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
});

const taskCount = computed(() => plannedTasks.value.length);

const showActions = computed(
	() =>
		reviewStatus.value === 'pending' &&
		!isResolved.value &&
		!props.readOnly &&
		!props.loading &&
		taskCount.value > 0,
);

const reviewStatus = computed(() => props.status ?? resolvedAction.value ?? 'pending');

const showChangesRequested = computed(() => reviewStatus.value === 'changes-requested');

const isShimmering = computed(() => Boolean(props.loading || props.updating));

function getSectionKey(task: PlannedTaskArg): SectionKey {
	const matchingSection = SECTION_CONFIG.find(
		(section) => section.key !== 'tasks' && section.kinds.includes(task.kind),
	);
	return matchingSection?.key ?? 'tasks';
}

const nonCheckTasks = computed(() =>
	plannedTasks.value.filter((task) => getSectionKey(task) !== 'checks'),
);

const artifacts = computed<PlanArtifact[]>(() =>
	plannedTasks.value.flatMap((task) => {
		const icon = getArtifactIcon(task);
		if (!icon) return [];

		return [
			{
				id: task.id,
				title: getTaskPlanTitle(task),
				description: getFirstSentence(task.spec),
				icon,
			},
		];
	}),
);

const artifactTasks = computed(() =>
	plannedTasks.value.filter((task) => getArtifactIcon(task) !== null),
);

const triggerItems = computed(() =>
	dedupePlanItems(
		artifactTasks.value
			.filter((task) => getSectionKey(task) === 'workflows')
			.flatMap((task) => getTriggerItems(task)),
	),
);

const connectionItems = computed(() =>
	dedupePlanItems(
		artifactTasks.value
			.filter((task) => getSectionKey(task) === 'workflows')
			.flatMap((task) => getConnectionItems(task)),
	),
);

const titleTasks = computed(() => {
	const workflowTasks = artifactTasks.value.filter((task) => getSectionKey(task) === 'workflows');
	if (workflowTasks.length > 0) return workflowTasks;
	if (artifactTasks.value.length > 0) return artifactTasks.value;
	if (nonCheckTasks.value.length > 0) return nonCheckTasks.value;
	return plannedTasks.value;
});

const planTitle = computed(() => {
	const taskTitles = titleTasks.value.map(getTaskPlanTitle).filter((title) => title.length > 0);
	if (taskTitles.length === 0) {
		return i18n.baseText('instanceAi.planReview.defaultTitle' as BaseTextKey);
	}

	return getSharedPlanTitle(taskTitles);
});

const planSummary = computed(() => {
	const sentences: string[] = [];

	if (artifacts.value.length > 0) {
		sentences.push(
			i18n.baseText('instanceAi.planReview.summary.artifacts' as BaseTextKey, {
				interpolate: { artifacts: formatList(artifacts.value.map((artifact) => artifact.title)) },
			}),
		);
	}

	const detailSentence = getPrimaryDetailSentence();
	if (detailSentence) {
		sentences.push(detailSentence);
	}

	const hasVerification = plannedTasks.value.some((task) => getSectionKey(task) === 'checks');
	const hasResearch = plannedTasks.value.some((task) => getSectionKey(task) === 'research');
	const hasSupportingTasks = plannedTasks.value.some(
		(task) => getSectionKey(task) === 'tasks' && getArtifactIcon(task) === null,
	);

	if (hasVerification) {
		sentences.push(i18n.baseText('instanceAi.planReview.summary.verification' as BaseTextKey));
	} else if (hasResearch) {
		sentences.push(i18n.baseText('instanceAi.planReview.summary.research' as BaseTextKey));
	} else if (hasSupportingTasks) {
		sentences.push(i18n.baseText('instanceAi.planReview.summary.supportingTasks' as BaseTextKey));
	}

	return sentences.slice(0, 3).join(' ');
});

function getArtifactIcon(task: PlannedTaskArg): PlanArtifact['icon'] | null {
	const sectionKey = getSectionKey(task);
	if (sectionKey === 'workflows') return 'workflow';
	if (sectionKey === 'dataTables') return 'table';
	return null;
}

function getTriggerItems(task: PlannedTaskArg): PlanItem[] {
	const text = getTaskSearchText(task);
	const triggers: PlanItem[] = [];

	if (/slack[-\s]?triggered|slack.*(message|event|trigger|posted)/i.test(text)) {
		triggers.push({
			id: 'trigger-slack',
			title: 'Slack',
			description: i18n.baseText('instanceAi.planReview.triggers.slack' as BaseTextKey),
			icon: 'slack',
		});
	}

	if (/(n8n[-\s]?hosted|built[-\s]?in)?\s*chat interface|chat trigger|chat input/i.test(text)) {
		triggers.push({
			id: 'trigger-chat',
			title: 'n8n Chat',
			description: i18n.baseText('instanceAi.planReview.triggers.chat' as BaseTextKey),
			icon: 'message-circle',
		});
	}

	if (/webhook|http post|post request/i.test(text)) {
		triggers.push({
			id: 'trigger-webhook',
			title: 'Webhook',
			description: i18n.baseText('instanceAi.planReview.triggers.webhook' as BaseTextKey),
			icon: 'webhook',
		});
	}

	if (/schedule|scheduled|cron/i.test(text)) {
		triggers.push({
			id: 'trigger-schedule',
			title: 'Schedule',
			description: i18n.baseText('instanceAi.planReview.triggers.schedule' as BaseTextKey),
			icon: 'calendar',
		});
	}

	if (/form trigger|form submission|submitted form/i.test(text)) {
		triggers.push({
			id: 'trigger-form',
			title: 'Form',
			description: i18n.baseText('instanceAi.planReview.triggers.form' as BaseTextKey),
			icon: 'form',
		});
	}

	return triggers;
}

function getConnectionItems(task: PlannedTaskArg): PlanItem[] {
	const text = getTaskSearchText(task);
	const connections: PlanItem[] = [];

	if (/slack/i.test(text)) {
		connections.push({
			id: 'connection-slack',
			title: 'Slack',
			description: i18n.baseText('instanceAi.planReview.connections.slack' as BaseTextKey),
			icon: 'slack',
		});
	}

	if (/github/i.test(text)) {
		connections.push({
			id: 'connection-github',
			title: 'GitHub',
			description: i18n.baseText('instanceAi.planReview.connections.github' as BaseTextKey),
			icon: 'git-branch',
		});
	}

	if (/anthropic|claude/i.test(text)) {
		connections.push({
			id: 'connection-anthropic',
			title: 'Anthropic',
			description: i18n.baseText('instanceAi.planReview.connections.anthropic' as BaseTextKey),
			icon: 'anthropic',
		});
	}

	if (/openai|open ai|gpt/i.test(text)) {
		connections.push({
			id: 'connection-openai',
			title: 'OpenAI',
			description: i18n.baseText('instanceAi.planReview.connections.openai' as BaseTextKey),
			icon: 'bot',
		});
	}

	if (/http request|external api|api endpoint/i.test(text)) {
		connections.push({
			id: 'connection-http',
			title: 'HTTP API',
			description: i18n.baseText('instanceAi.planReview.connections.http' as BaseTextKey),
			icon: 'globe',
		});
	}

	return connections;
}

function getTaskSearchText(task: PlannedTaskArg): string {
	return [task.title, task.spec, ...(task.tools ?? [])].join(' ');
}

function dedupePlanItems(items: PlanItem[]): PlanItem[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

function getPrimaryDetailSentence(): string {
	const workflowTask = artifactTasks.value.find((task) => getSectionKey(task) === 'workflows');
	const primaryTask = workflowTask ?? artifactTasks.value[0] ?? nonCheckTasks.value[0];
	if (!primaryTask) return '';

	return getFirstSentence(primaryTask.spec);
}

function getFirstSentence(text: string): string {
	const normalized = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ');

	return normalized.match(/.+?[.!?](?:\s|$)/)?.[0].trim() ?? normalized;
}

function getTaskPlanTitle(task: PlannedTaskArg): string {
	const quotedTitle = task.title.match(/['"“”‘’]([^'"“”‘’]+)['"“”‘’]/)?.[1];
	return cleanPlanTitle(quotedTitle ?? task.title);
}

function cleanPlanTitle(title: string): string {
	return title
		.trim()
		.replace(/^(build|create|verify|review|confirm|find|document|set up|setup)\s+/i, '')
		.replace(/\s+(workflow|data table|table)$/i, '')
		.replace(/\s+runs successfully$/i, '')
		.trim();
}

function getSharedPlanTitle(taskTitles: string[]): string {
	const baseTitles = taskTitles.map((title) => title.split(/\s+[-–—]\s+/)[0]?.trim() ?? title);
	const sharedBase = baseTitles[0];

	if (sharedBase && baseTitles.every((title) => title.toLowerCase() === sharedBase.toLowerCase())) {
		return sharedBase;
	}

	return taskTitles[0] ?? i18n.baseText('instanceAi.planReview.defaultTitle' as BaseTextKey);
}

function formatList(items: string[]): string {
	if (items.length <= 1) return items[0] ?? '';
	if (items.length === 2) return `${items[0]} and ${items[1]}`;

	return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function handleApprove() {
	if (isResolved.value) return;
	isResolved.value = true;
	resolvedAction.value = 'approved';
	emit('approve');
}

function handleRequestChanges() {
	if (isResolved.value) return;
	emit('request-changes');
}
</script>

<template>
	<div
		:class="$style.root"
		:aria-busy="isShimmering ? 'true' : undefined"
		:data-loading="isShimmering ? 'true' : undefined"
		data-test-id="instance-ai-plan-review"
	>
		<div :class="$style.header">
			<div :class="$style.headerText">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.planReview.label' as BaseTextKey) }}
				</N8nText>
				<N8nText
					tag="h3"
					size="large"
					bold
					:class="[$style.title, isShimmering && $style.titleShimmer]"
				>
					{{ planTitle }}
				</N8nText>
				<N8nText v-if="planSummary" tag="p" :class="$style.summary">
					{{ planSummary }}
				</N8nText>
			</div>
			<N8nText v-if="reviewStatus === 'approved'" size="small" bold color="success">
				{{ i18n.baseText('instanceAi.planReview.approved') }}
			</N8nText>
			<div v-else-if="showChangesRequested && updating" :class="$style.headerStatus">
				<N8nIcon icon="loader" size="small" :class="$style.loadingIcon" />
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.planReview.updating' as BaseTextKey) }}
				</N8nText>
			</div>
		</div>

		<div
			v-if="(props.loading && plannedTasks.length === 0) || artifacts.length > 0"
			:class="$style.content"
		>
			<div v-if="props.loading && plannedTasks.length === 0" :class="$style.loadingState">
				<N8nIcon icon="loader" size="medium" :class="$style.loadingIcon" />
				<N8nText color="text-light">
					{{ i18n.baseText('instanceAi.planReview.building') }}
				</N8nText>
			</div>
			<section
				v-else-if="artifacts.length > 0"
				:class="$style.planSection"
				data-test-id="instance-ai-plan-artifacts"
			>
				<N8nText size="small" bold color="text-light">
					{{ i18n.baseText('instanceAi.planReview.sections.artifacts' as BaseTextKey) }}
				</N8nText>
				<div :class="$style.artifactList">
					<div
						v-for="artifact in artifacts"
						:key="artifact.id"
						:class="$style.artifactItem"
						data-test-id="instance-ai-plan-artifact"
					>
						<N8nIcon :icon="artifact.icon" size="small" :class="$style.artifactIcon" />
						<div :class="$style.artifactBody">
							<N8nText :class="$style.artifactTitle">
								{{ artifact.title }}
							</N8nText>
							<N8nText
								v-if="artifact.description"
								tag="p"
								size="small"
								color="text-light"
								:class="$style.artifactDescription"
							>
								{{ artifact.description }}
							</N8nText>
						</div>
					</div>
				</div>
			</section>

			<section
				v-if="triggerItems.length > 0"
				:class="$style.planSection"
				data-test-id="instance-ai-plan-triggers"
			>
				<N8nText size="small" bold color="text-light">
					{{ i18n.baseText('instanceAi.planReview.sections.triggers' as BaseTextKey) }}
				</N8nText>
				<div :class="$style.artifactList">
					<div
						v-for="trigger in triggerItems"
						:key="trigger.id"
						:class="$style.artifactItem"
						data-test-id="instance-ai-plan-trigger"
					>
						<N8nIcon :icon="trigger.icon" size="small" :class="$style.artifactIcon" />
						<div :class="$style.artifactBody">
							<N8nText :class="$style.artifactTitle">{{ trigger.title }}</N8nText>
							<N8nText tag="p" size="small" color="text-light" :class="$style.artifactDescription">
								{{ trigger.description }}
							</N8nText>
						</div>
					</div>
				</div>
			</section>

			<section
				v-if="connectionItems.length > 0"
				:class="$style.planSection"
				data-test-id="instance-ai-plan-connections"
			>
				<N8nText size="small" bold color="text-light">
					{{ i18n.baseText('instanceAi.planReview.sections.connections' as BaseTextKey) }}
				</N8nText>
				<div :class="$style.artifactList">
					<div
						v-for="connection in connectionItems"
						:key="connection.id"
						:class="$style.artifactItem"
						data-test-id="instance-ai-plan-connection"
					>
						<N8nIcon :icon="connection.icon" size="small" :class="$style.artifactIcon" />
						<div :class="$style.artifactBody">
							<N8nText :class="$style.artifactTitle">{{ connection.title }}</N8nText>
							<N8nText tag="p" size="small" color="text-light" :class="$style.artifactDescription">
								{{ connection.description }}
							</N8nText>
						</div>
					</div>
				</div>
			</section>
		</div>

		<ConfirmationFooter v-if="showActions" layout="row-end" bordered>
			<N8nButton
				variant="outline"
				size="medium"
				:disabled="disabled"
				data-test-id="instance-ai-plan-request-changes"
				@click="handleRequestChanges"
			>
				{{ i18n.baseText('instanceAi.planReview.requestChanges') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				size="medium"
				:disabled="disabled"
				data-test-id="instance-ai-plan-approve"
				@click="handleApprove"
			>
				{{ i18n.baseText('instanceAi.planReview.approve') }}
			</N8nButton>
		</ConfirmationFooter>

		<ConfirmationFooter v-else-if="showChangesRequested" layout="row-end" bordered>
			<N8nButton
				variant="outline"
				size="medium"
				disabled
				data-test-id="instance-ai-plan-changes-requested"
			>
				{{ i18n.baseText('instanceAi.planReview.changesRequested' as BaseTextKey) }}
			</N8nButton>
		</ConfirmationFooter>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.root {
	position: relative;
	isolation: isolate;
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background-color: var(--background--surface);
	max-width: 90%;
	box-shadow: var(--shadow--xs);

	> * {
		position: relative;
		z-index: 1;
	}
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.title {
	margin: 0;
}

.summary {
	margin: var(--spacing--3xs) 0 0;
	width: 100%;
}

.titleShimmer {
	--animation--shimmer--background: var(--text-color);
	--animation--shimmer--foreground: var(--color--text--tint-2);
	--animation--shimmer--duration: var(--duration--slowest);

	@include motion.shimmer;
}

.headerStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.loadingState {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--text--tint-1);
}

.loadingIcon {
	@include motion.spin;
}

.planSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.artifactList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.artifactItem {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.artifactIcon {
	margin-top: var(--spacing--5xs);
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.artifactBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.artifactTitle {
	overflow-wrap: anywhere;
}

.artifactDescription {
	margin: 0;
	overflow-wrap: anywhere;
}
</style>
