<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useStorage } from '@n8n/composables/useStorage';
import { useToast } from '@n8n/composables/useToast';
import { useUsersStore } from '@n8n/stores/users.store';
import { LOCAL_STORAGE_ACTIVATION_FLAG } from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import type { ForceFirstWorkflowStep } from '../constants';
import {
	DESTINATION_OPTIONS,
	FORMAT_OPTIONS,
	PROVIDER_OPTIONS,
	QUESTION_IDS,
	formatTime,
	type QuestionAnswer,
	type QuestionId,
} from '../questions';
import { useForceFirstWorkflowStore } from '../stores/forceFirstWorkflow.store';
import {
	buildDailyInboxDigestWorkflow,
	DEFAULT_DIGEST_OPTIONS,
	type DailyInboxDigestOptions,
	type DigestNodeNames,
} from '../workflows/dailyInboxDigest';
import FirstWorkflowCanvas from './FirstWorkflowCanvas.vue';
import FirstWorkflowMessage from './FirstWorkflowMessage.vue';
import FirstWorkflowQuestionCard from './FirstWorkflowQuestionCard.vue';
import FirstWorkflowTopBar from './FirstWorkflowTopBar.vue';

type FlowStage = 'questions' | 'test' | 'live';

interface ChatMessage {
	id: number;
	role: 'assistant' | 'user';
	text: string;
}

// The telemetry names the steps by what they ask for, and the provider question is the email step.
const TELEMETRY_STEP_BY_QUESTION: Record<QuestionId, ForceFirstWorkflowStep> = {
	format: 'summary',
	schedule: 'schedule',
	provider: 'email',
	destination: 'destination',
};

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const forceFirstWorkflowStore = useForceFirstWorkflowStore();

const stage = ref<FlowStage>('questions');
const questionIndex = ref(0);
// What the flow said after the questions: that the workflow is built, and the test results.
const flowMessages = ref<Array<Pick<ChatMessage, 'role' | 'text'>>>([]);
// Answers stay when the user steps back, so a question opens on what they chose before.
const answers = ref<Partial<Record<QuestionId, QuestionAnswer>>>({});
const trackedQuestions = new Set<QuestionId>();

const digestOptions = ref<DailyInboxDigestOptions>({
	...DEFAULT_DIGEST_OPTIONS,
	recipientEmail: usersStore.currentUser?.email ?? '',
});

// The canvas shows these, so they follow the answers: "Every day at 6:00 PM", "Weekdays at 8:00 AM".
const nodeNames = computed<DigestNodeNames>(() => {
	const options = digestOptions.value;
	return {
		trigger: i18n.baseText(
			options.weekdaysOnly
				? 'experiments.forceFirstWorkflow.node.trigger.weekdays'
				: 'experiments.forceFirstWorkflow.node.trigger.everyDay',
			{ interpolate: { time: formatTime(options.hour, options.minute) } },
		),
		read: i18n.baseText('experiments.forceFirstWorkflow.node.read'),
		build: i18n.baseText(`experiments.forceFirstWorkflow.node.build.${options.format}`),
		send: i18n.baseText(
			options.destination === 'slack'
				? 'experiments.forceFirstWorkflow.node.send.slack'
				: 'experiments.forceFirstWorkflow.node.send.email',
		),
	};
});

const buildWorkflow = () => buildDailyInboxDigestWorkflow(digestOptions.value, nodeNames.value);

const workflowName = buildWorkflow().name ?? '';
const workflowId = ref<string>();
const versionId = ref<string>();
// The saved nodes of the latest update. The canvas shows them in place, because a reload would
// swap it for a loading view.
const latestWorkflow = ref<Pick<IWorkflowDb, 'nodes' | 'connections'>>();
const isCanvasLoaded = ref(false);
const testRequest = ref(0);
const isTesting = ref(false);
const isTestSuccessful = ref(false);
const hasTested = ref(false);

const currentQuestion = computed<QuestionId>(() => QUESTION_IDS[questionIndex.value]);

function say(role: ChatMessage['role'], text: string) {
	flowMessages.value.push({ role, text });
}

const canGoBack = computed(() => questionIndex.value > 0);
const canGoForward = computed(
	() =>
		questionIndex.value < QUESTION_IDS.length - 1 &&
		answers.value[currentQuestion.value] !== undefined,
);

function goBack() {
	if (canGoBack.value) questionIndex.value--;
}

function goForward() {
	if (canGoForward.value) questionIndex.value++;
}

onMounted(async () => {
	forceFirstWorkflowStore.trackExposure();
	// The flow has its own success state. Mark the one-time "workflow is active" modal as seen
	// so it does not open on top of it.
	useStorage(LOCAL_STORAGE_ACTIVATION_FLAG).value = 'true';

	creation = createWorkflow();
	await creation;
});

// An answer can arrive before the workflow exists, so updates wait for its creation.
let creation: Promise<void> | undefined;

async function createWorkflow() {
	try {
		const created = await workflowsStore.createNewWorkflow(buildWorkflow());
		workflowId.value = created.id;
		versionId.value = created.versionId;
	} catch (error) {
		toast.showError(error, i18n.baseText('generic.error'));
		await leave();
	}
}

// The telemetry step names what the user was doing, so a skip after a good test counts as `publish`.
const telemetryStep = computed<ForceFirstWorkflowStep>(() => {
	if (stage.value === 'questions') return TELEMETRY_STEP_BY_QUESTION[currentQuestion.value];
	if (stage.value === 'test') return isTestSuccessful.value ? 'publish' : 'test';
	return 'publish';
});

const stepIndex = computed(() => {
	if (stage.value === 'questions') return 0;
	if (stage.value === 'test') return isTestSuccessful.value ? 2 : 1;
	return 3;
});

async function leave() {
	await router.replace({ name: INSTANCE_AI_VIEW });
}

async function skip() {
	await forceFirstWorkflowStore.skip(telemetryStep.value);
	await leave();
}

/** Puts the saved nodes into the open document. The canvas then follows without a reload. */
function showLatestWorkflow() {
	if (!isCanvasLoaded.value || !workflowId.value || !latestWorkflow.value) return;

	const workflowDocument = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId.value));
	workflowDocument.setNodes(latestWorkflow.value.nodes);
	workflowDocument.setConnections(latestWorkflow.value.connections);
}

// The canvas loads the version saved when it opened. Answers saved while it loaded come in here.
function onCanvasLoaded() {
	isCanvasLoaded.value = true;
	showLatestWorkflow();
}

async function applyAnswers() {
	await creation;
	if (!workflowId.value || !versionId.value) return;

	const { nodes, connections } = buildWorkflow();
	try {
		const updated = await workflowsStore.updateWorkflow(workflowId.value, {
			nodes,
			connections,
			versionId: versionId.value,
		});
		versionId.value = updated.versionId;
		latestWorkflow.value = { nodes: updated.nodes, connections: updated.connections };
		showLatestWorkflow();
	} catch (error) {
		toast.showError(error, i18n.baseText('generic.error'));
	}
}

function labelOf(options: ReadonlyArray<{ value: string; labelKey: BaseTextKey }>, value: string) {
	const option = options.find((candidate) => candidate.value === value);
	return option ? i18n.baseText(option.labelKey) : value;
}

/** Sets the digest options from one answer. */
function applyAnswer(answer: QuestionAnswer) {
	switch (answer.id) {
		case 'format':
			digestOptions.value.format = answer.value;
			return;
		case 'schedule':
			digestOptions.value.hour = answer.hour;
			digestOptions.value.minute = answer.minute;
			digestOptions.value.weekdaysOnly = answer.weekdaysOnly;
			return;
		case 'provider':
			digestOptions.value.provider = answer.value;
			return;
		case 'destination':
			digestOptions.value.destination = answer.value;
			return;
	}
}

/** What the user said for one answer, and how the Assistant replies to it. */
function transcriptFor(answer: QuestionAnswer): Array<Pick<ChatMessage, 'role' | 'text'>> {
	switch (answer.id) {
		case 'format': {
			const label = labelOf(FORMAT_OPTIONS, answer.value);
			return [
				{ role: 'user', text: label },
				{
					role: 'assistant',
					text:
						answer.value === 'decide'
							? i18n.baseText('experiments.forceFirstWorkflow.format.replyDecide')
							: i18n.baseText('experiments.forceFirstWorkflow.format.reply', {
									interpolate: { format: label.toLowerCase() },
								}),
				},
			];
		}
		case 'schedule': {
			const time = formatTime(answer.hour, answer.minute);
			const cadenceLabel = i18n.baseText(
				answer.weekdaysOnly
					? 'experiments.forceFirstWorkflow.schedule.weekdays'
					: 'experiments.forceFirstWorkflow.schedule.everyDay',
			);
			return [
				{ role: 'user', text: `${time}, ${cadenceLabel}` },
				{
					role: 'assistant',
					text: i18n.baseText('experiments.forceFirstWorkflow.schedule.reply', {
						interpolate: {
							time,
							cadence: i18n.baseText(
								answer.weekdaysOnly
									? 'experiments.forceFirstWorkflow.schedule.replyWeekdays'
									: 'experiments.forceFirstWorkflow.schedule.replyEveryDay',
							),
						},
					}),
				},
			];
		}
		case 'provider': {
			const label = labelOf(PROVIDER_OPTIONS, answer.value);
			return [
				{ role: 'user', text: label },
				{
					role: 'assistant',
					text: i18n.baseText('experiments.forceFirstWorkflow.provider.reply', {
						interpolate: { provider: label },
					}),
				},
			];
		}
		case 'destination':
			return [
				{
					role: 'user',
					text: i18n.baseText(
						answer.value === 'slack'
							? 'experiments.forceFirstWorkflow.destination.answerSlack'
							: 'experiments.forceFirstWorkflow.destination.answerEmail',
					),
				},
			];
	}
}

// The conversation follows the question on screen, so stepping back hides the later answers and
// stepping forward shows them again.
const conversation = computed<ChatMessage[]>(() => {
	const answeredQuestions =
		stage.value === 'questions' ? QUESTION_IDS.slice(0, questionIndex.value) : QUESTION_IDS;
	const messages = [
		{
			role: 'assistant' as const,
			text: i18n.baseText('experiments.forceFirstWorkflow.chat.intro'),
		},
		...answeredQuestions.flatMap((id) => {
			const answer = answers.value[id];
			return answer ? transcriptFor(answer) : [];
		}),
		...flowMessages.value,
	];
	return messages.map((message, id) => ({ id, ...message }));
});

// Each update saves the workflow with the version of the one before it, so they run one at a time.
let pendingUpdate: Promise<void> = Promise.resolve();

async function syncCanvas() {
	pendingUpdate = pendingUpdate.then(applyAnswers);
	await pendingUpdate;
}

async function onAnswer(answer: QuestionAnswer) {
	// A step counts once, however often the user changes the answer.
	if (!trackedQuestions.has(answer.id)) {
		trackedQuestions.add(answer.id);
		forceFirstWorkflowStore.trackStepCompleted(TELEMETRY_STEP_BY_QUESTION[answer.id]);
	}
	answers.value[answer.id] = answer;
	applyAnswer(answer);

	const isLastQuestion = questionIndex.value === QUESTION_IDS.length - 1;
	// The next question shows right away. The canvas catches up as soon as the save is done.
	if (!isLastQuestion) questionIndex.value++;

	await syncCanvas();
	if (!isLastQuestion) return;

	say('assistant', i18n.baseText('experiments.forceFirstWorkflow.chat.built'));
	say('assistant', i18n.baseText('experiments.forceFirstWorkflow.chat.ready'));
	stage.value = 'test';
}

function runTest() {
	isTesting.value = true;
	testRequest.value++;
}

function onTested(succeeded: boolean, message?: string) {
	isTesting.value = false;
	hasTested.value = true;
	isTestSuccessful.value = succeeded;
	forceFirstWorkflowStore.trackStepCompleted('test', succeeded);

	if (succeeded) {
		say('assistant', i18n.baseText('experiments.forceFirstWorkflow.chat.testSuccess'));
	} else {
		say(
			'assistant',
			message
				? i18n.baseText('experiments.forceFirstWorkflow.chat.testError', {
						interpolate: { message },
					})
				: i18n.baseText('experiments.forceFirstWorkflow.chat.testErrorGeneric'),
		);
	}
}

async function onPublished() {
	if (!workflowId.value || stage.value === 'live') return;

	stage.value = 'live';
	say('assistant', i18n.baseText('experiments.forceFirstWorkflow.chat.published'));
	await forceFirstWorkflowStore.complete(workflowId.value);
}
</script>

<template>
	<div :class="$style.view" data-test-id="first-workflow-view">
		<FirstWorkflowTopBar
			:workflow-name="workflowName"
			:step-index="stepIndex"
			:show-skip="stage !== 'live'"
			@skip="skip"
		/>

		<div :class="$style.body">
			<section :class="$style.chat" data-test-id="first-workflow-chat">
				<!-- Reversed, so the conversation sits at the bottom and stays scrolled to its end. -->
				<div :class="$style.scroll">
					<div :class="$style.conversation">
						<header :class="$style.welcome">
							<N8nText color="text-light" bold>
								{{ i18n.baseText('experiments.forceFirstWorkflow.welcome') }}
							</N8nText>
							<N8nHeading tag="h1" size="2xlarge" bold>
								{{ i18n.baseText('experiments.forceFirstWorkflow.headline') }}
							</N8nHeading>
						</header>

						<FirstWorkflowMessage
							v-for="message in conversation"
							:key="message.id"
							:role="message.role"
							:text="message.text"
						/>

						<FirstWorkflowQuestionCard
							v-if="stage === 'questions'"
							:key="currentQuestion"
							:question-id="currentQuestion"
							:answer="answers[currentQuestion]"
							:can-go-back="canGoBack"
							:can-go-forward="canGoForward"
							@answer="onAnswer"
							@back="goBack"
							@forward="goForward"
						/>
						<N8nButton
							v-else-if="stage === 'test'"
							:variant="isTestSuccessful ? 'outline' : 'solid'"
							:label="
								i18n.baseText(
									hasTested
										? 'experiments.forceFirstWorkflow.test.retry'
										: 'experiments.forceFirstWorkflow.test.button',
								)
							"
							:loading="isTesting"
							:class="$style.action"
							data-test-id="first-workflow-test-button"
							data-attr="first-workflow-test-button"
							@click="runTest"
						/>
						<N8nButton
							v-else
							:label="i18n.baseText('experiments.forceFirstWorkflow.success.cta')"
							:class="$style.action"
							data-test-id="first-workflow-continue"
							data-attr="first-workflow-continue"
							@click="leave"
						/>
					</div>
				</div>
			</section>

			<main :class="$style.canvas">
				<FirstWorkflowCanvas
					v-if="workflowId"
					:workflow-id="workflowId"
					@loaded="onCanvasLoaded"
					:test-request="testRequest"
					@tested="onTested"
					@published="onPublished"
				/>
			</main>
		</div>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	width: 100vw;
	height: 100vh;
	background: var(--color--background--light-2);
}

.body {
	display: flex;
	flex: 1;
	min-height: 0;
}

.chat {
	display: flex;
	flex: 0 0 55%;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	border-right: var(--border);
}

.scroll {
	display: flex;
	flex: 1;
	flex-direction: column-reverse;
	min-height: 0;
	overflow-y: auto;
}

.conversation {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
	padding: var(--spacing--xl) var(--spacing--md) var(--spacing--lg);
}

.welcome {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--sm);
}

.action {
	align-self: flex-start;
}

.canvas {
	flex: 1;
	min-width: 0;
	height: 100%;
}
</style>
