<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import PlanReviewPanel, {
	type PlanReviewStatus,
	type PlannedTaskArg,
} from '../components/PlanReviewPanel.vue';

interface DevState {
	id: string;
	title: string;
	description: string;
	tasks: PlannedTaskArg[];
	loading?: boolean;
	readOnly?: boolean;
	status?: PlanReviewStatus;
	updating?: boolean;
}

const baseTasks: PlannedTaskArg[] = [
	{
		id: 'workflow-chat',
		title: "Build 'UI Copy Feedback Agent - n8n Chat' workflow",
		kind: 'build-workflow',
		spec: 'A conversational AI agent triggered via the n8n-hosted chat interface. Users paste UI copy and receive structured feedback on tone, clarity, readability, grammar, and spelling. The workflow uses Anthropic for the model and fetches content guidelines from GitHub.',
		deps: [],
	},
	{
		id: 'workflow-slack',
		title: "Build 'UI Copy Feedback Agent - Slack Bot' workflow",
		kind: 'build-workflow',
		spec: 'A Slack-triggered agent that replies in thread with content design feedback and suggested alternatives. It uses the same Anthropic model and GitHub guideline source as the chat workflow.',
		deps: [],
	},
	{
		id: 'verify-chat',
		title: "Verify 'UI Copy Feedback Agent - n8n Chat' runs successfully",
		kind: 'checkpoint',
		spec: 'Use verify-built-workflow with the work item ID from the chat build outcome. Confirm the workflow completes without errors.',
		deps: ['workflow-chat'],
	},
	{
		id: 'verify-slack',
		title: "Verify 'UI Copy Feedback Agent - Slack Bot' runs successfully",
		kind: 'checkpoint',
		spec: 'Use verify-built-workflow with the work item ID from the Slack build outcome. Confirm the workflow completes without errors.',
		deps: ['workflow-slack'],
	},
];

const mixedTasks: PlannedTaskArg[] = [
	{
		id: 'research',
		title: 'Confirm current product terminology',
		kind: 'research',
		spec: 'Check n8n product naming and terminology so the agent can avoid stale wording in copy reviews.',
		deps: [],
	},
	{
		id: 'table',
		title: "Create 'Copy Review History' data table",
		kind: 'manage-data-tables',
		spec: 'Create a table to store source copy, issue severity, suggested replacement, and review timestamp.',
		deps: [],
	},
	{
		id: 'workflow',
		title: "Build 'Copy Review Logger' workflow",
		kind: 'build-workflow',
		spec: 'Build a workflow that receives chat input, runs the copy review agent, and records flagged issues in the data table.',
		deps: ['research', 'table'],
	},
	{
		id: 'verify',
		title: "Verify 'Copy Review Logger' saves feedback",
		kind: 'checkpoint',
		spec: 'Run a sample copy review and confirm the table receives the expected review rows.',
		deps: ['workflow'],
	},
];

const duplicatedTasks: PlannedTaskArg[] = [
	...baseTasks,
	{
		...baseTasks[0],
		id: 'workflow-chat-copy',
	},
];

const states = computed<DevState[]>(() => [
	{
		id: 'building',
		title: 'Initial building',
		description: 'Empty plan with the shimmer/loading treatment while planning starts.',
		tasks: [],
		loading: true,
	},
	{
		id: 'pending',
		title: 'Pending approval',
		description:
			'Default review state with two actions and generated artifacts listed in the card.',
		tasks: baseTasks,
	},
	{
		id: 'updating',
		title: 'Changes requested',
		description: 'State shown after edit feedback has been submitted and the plan is regenerating.',
		tasks: baseTasks,
		status: 'changes-requested',
		updating: true,
		readOnly: true,
	},
	{
		id: 'approved',
		title: 'Approved read-only',
		description: 'Resolved approved state without pending actions.',
		tasks: baseTasks,
		status: 'approved',
		readOnly: true,
	},
	{
		id: 'mixed',
		title: 'Mixed task kinds',
		description: 'Research, data table, workflow, and verify tasks in one plan.',
		tasks: mixedTasks,
	},
	{
		id: 'deduped',
		title: 'Duplicate title guard',
		description: 'Repeated task title included in input; the card should render it once.',
		tasks: duplicatedTasks,
	},
]);

const eventLog = ref<string[]>([]);

function logEvent(stateTitle: string, event: string) {
	eventLog.value = [`${stateTitle}: ${event}`, ...eventLog.value].slice(0, 6);
}
</script>

<template>
	<div :class="$style.page" data-test-id="instance-ai-plan-review-dev-page">
		<header :class="$style.header">
			<div>
				<N8nHeading tag="h1" size="large">Plan review dev states</N8nHeading>
				<N8nText color="text-light">
					Temporary development page for visually checking Instance AI plan review variants.
				</N8nText>
			</div>
			<N8nButton href="/instance-ai" variant="outline">Back to Instance AI</N8nButton>
		</header>

		<section v-if="eventLog.length > 0" :class="$style.eventLog">
			<N8nText bold>Events</N8nText>
			<N8nText v-for="event in eventLog" :key="event" size="small" color="text-light">
				{{ event }}
			</N8nText>
		</section>

		<div :class="$style.grid">
			<section v-for="state in states" :key="state.id" :class="$style.state">
				<div :class="$style.stateHeader">
					<N8nHeading tag="h2" size="small">{{ state.title }}</N8nHeading>
					<N8nText color="text-light">{{ state.description }}</N8nText>
				</div>
				<PlanReviewPanel
					:planned-tasks="state.tasks"
					:loading="state.loading"
					:read-only="state.readOnly"
					:status="state.status"
					:updating="state.updating"
					@approve="logEvent(state.title, 'approve')"
					@request-changes="logEvent(state.title, 'ask for edits')"
				/>
			</section>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	width: 100%;
	height: 100%;
	overflow: auto;
	padding: var(--spacing--xl);
	background: var(--color--background--light-2);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
	margin: 0 auto var(--spacing--xl);
	max-width: 1160px;
}

.eventLog {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-width: 1160px;
	margin: 0 auto var(--spacing--lg);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--md);
	background: var(--background--surface);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
	gap: var(--spacing--lg);
	max-width: 1160px;
	margin: 0 auto;
}

.state {
	min-width: 0;
}

.stateHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--xs);
}
</style>
