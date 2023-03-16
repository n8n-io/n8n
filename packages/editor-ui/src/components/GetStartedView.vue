<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router/composables';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

import MainPanel from './Node/NodeCreator/MainPanel.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { SCHEDULE_TRIGGER_NODE_TYPE, VIEWS, WEBHOOK_NODE_TYPE } from '@/constants';

const steps = [
	{
		id: 'select-node',
		progress: 10,
	},
	{
		id: 'open-node',
		progress: 25,
		panel: {
			title: 'Set up your Google Calendar Trigger',
			desc: 'Double-click on a node to set it up',
		},
	},
	{
		id: 'create-cred',
		progress: 25,
		panel: {
			title: 'Create a Google Calendar credential',
			desc: 'Your Google Calendar Trigger needs this to connect to your Google Calendar account and listen for new <b>On Event Created</b> events',
		},
	},
	{
		id: 'add-cred-details',
		progress: 53,
		panel: {
			title: 'Connect to Google Calendar',
			desc: 'Enter required credential details to continue. You can find this information in your Google Calendar account.',
		},
		resources: [
			{
				title: 'Google credential documentation',
				desc: 'Official docs maintained by the n8n team',
			},
			{
				title: 'Google OAuth2 setup video',
				type: 'youtube',
			},
		],
	},
	{
		id: 'sign-in',
		progress: 53,
		panel: {
			title: 'Complete sign in',
			desc: 'Click the “Sign in with Google” button, complete the pop-up flow, then return here.',
		},
	},
	{
		id: 'save-cred',
		progress: 76,
		panel: {
			title: 'Save your new credential',
			desc: 'Save the credential so that your Google Calendar Trigger can use it to watch for new <b>On Event Created</b> events in your account',
		},
		resources: [
			{
				title: 'Google credential documentation',
				desc: 'Official docs maintained by the n8n team',
			},
			{
				title: 'Google OAuth2 setup video',
				type: 'youtube',
			},
		],
	},
	{
		id: 'setup-params',
		progress: 76,
		panel: {
			title: 'Complete remaining parameters',
			desc: 'We just need a bit more information to finish setting up your Google Calendar Trigger',
		},
		resources: [
			{
				title: 'Google Calendar Trigger documentation',
				desc: 'Official docs maintained by the n8n team',
			},
			{
				title: 'n8n community forums',
				desc: 'Global community of n8n power users ready to help',
				type: 'forum',
			},
		],
	},
	{
		id: 'test-step',
		progress: 94,
		panel: {
			title: 'Test your Trigger Step',
			desc: 'Testing a Trigger ensures that n8n can receive new events from Google Calendar. \n It also loads the schema and typical values of a <b>On Event Created</b> event into the Trigger, which you can reference in other steps in your workflow.',
		},
	},
	{
		id: 'done',
		progress: 98,
		panel: {
			title: 'You did it 🚀',
			desc: 'You set up and tested your first Trigger node in n8n!',
		},
		action: {
			title: 'Continue building my workflow',
			id: 'continue',
		},
	},
];

const router = useRouter();
const current = ref(0);
const loading = ref(true);
const kickoff = ref([] as string[]);

onMounted(async () => {
	await useNodeTypesStore().getNodeTypes();
	loading.value = false;
});

function openWorkflow(nodes: string[]) {
	if (
		nodes.length === 1 &&
		(nodes.includes(SCHEDULE_TRIGGER_NODE_TYPE) || nodes.includes(WEBHOOK_NODE_TYPE))
	) {
		router.push({ name: VIEWS.NEW_WORKFLOW, query: { start: nodes.join(',') } });
	} else {
		kickoff.value = nodes;
		current.value = 1;
	}
}

const currentStep = computed(() => {
	return steps[current.value];
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.progressBar">
			<div :style="{ width: `${currentStep.progress}%` }"></div>
		</div>

		<div :class="$style.nodes" v-if="!loading && currentStep.id === 'select-node'">
			<main-panel @nodeTypeSelected="openWorkflow" />
		</div>
		<div v-show="!loading && currentStep.id !== 'select-node'" :class="$style.other">
			<WorkflowPreview :nodes="kickoff" />
			<div :class="$style.panel">
				<div :class="$style.icon">
					<font-awesome-icon icon="question-circle" />
				</div>
				<div :class="$style.title">{{ currentStep.panel?.title }}</div>
				<div :class="$style.desc">{{ currentStep.panel?.desc }}</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.icon {
	margin-bottom: 16px;
	color: #C6C8D0;
	font-size: 24px;
}

.other {
	width: 100%;
	height: 100%;
	display: flex;
}

.panel {
	height: 100%;
	width: 790px;
	border-left: var(--border-base);
	background-color: white;
	padding: 32px 24px;
}

.title {
	font-weight: 400;
	font-size: 16px;
	line-height: 24px;
	color: #555555;
	margin-bottom: 8px;
}

.desc {
	font-weight: 400;
	color: #7d7d87;
	font-size: 14px;
	line-height: 19px;
}

.progressBar {
	width: 100%;
	height: 12px;
	background-color: #eeecf9;

	> div {
		background-color: #5c4ec2;
		height: 12px;
	}
}

.nodes {
	width: 480px;
	margin-top: 44px;

	> div {
		margin-bottom: 8px;
	}
}
</style>
