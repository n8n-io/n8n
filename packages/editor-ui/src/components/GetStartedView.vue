<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router/composables';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

import MainPanel from './Node/NodeCreator/MainPanel.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { SCHEDULE_TRIGGER_NODE_TYPE, VIEWS, WEBHOOK_NODE_TYPE } from '@/constants';
import { IUpdateInformation } from '@/Interface';

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
			desc: 'Your Google Calendar Trigger needs this to connect to your Google Calendar account and listen for new <b>On Event Created<svg data-v-9b141c92="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="bolt" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="svg-inline--fa fa-bolt fa-w-10 fa-xs _triggerIcon_1mk62_64"><path data-v-9b141c92="" fill="#7d7d87" d="M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z" class=""></path></svg></b> events',
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
				href: 'https://docs.n8n.io/integrations/builtin/credentials/google/',
			},
			{
				title: 'Google OAuth2 setup video',
				type: 'youtube',
				href: 'https://www.youtube.com/watch?v=gZ6N2H3_vys',
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
			title: 'Go back to continue building app',
			desc: 'Close this view by clicking on the background or the close <b>X</b> button.',
		},
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
				href: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecalendar/',
			},
			{
				title: 'n8n community forums',
				desc: 'Global community of n8n power users ready to help',
				type: 'forum',
				href: 'https://community.n8n.io/',
			},
		],
	},
	{
		id: 'test-step',
		progress: 94,
		panel: {
			title: 'Test your Trigger Step',
			desc: 'Testing a Trigger ensures that n8n can receive new events from Google Calendar. \n It also loads the schema and typical values of a <b>On Event Created<svg data-v-9b141c92="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="bolt" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="svg-inline--fa fa-bolt fa-w-10 fa-xs _triggerIcon_1mk62_64"><path data-v-9b141c92="" fill="#7d7d87" d="M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z" class=""></path></svg></b> event into the Trigger, which you can reference in other steps in your workflow.',
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
const loading = ref(true);

const current = ref(0);
const kickoff = ref([] as Array<string | IUpdateInformation>);

// const current = ref(8);
// const kickoff = ref([
// 	{ key: 'n8n-nodes-base.googleCalendarTrigger', name: 'Test node', value: { position: [0, 0] } },
// ] as Array<string | IUpdateInformation>);

const preview = ref();

onMounted(async () => {
	await useNodeTypesStore().getNodeTypes();
	loading.value = false;
});

function openWorkflow(nodes: Array<string | IUpdateInformation>) {
	if (
		nodes.length === 1 &&
		(nodes.includes(SCHEDULE_TRIGGER_NODE_TYPE) || nodes.includes(WEBHOOK_NODE_TYPE))
	) {
		router.push({ name: VIEWS.NEW_WORKFLOW, query: { start: nodes.join(',') } });
		return;
	} else {
		if (typeof nodes[0] === 'object') {
			nodes[0].value.position = [0, 0];
		}
		kickoff.value = [nodes[0]];
		current.value = 1;
		return;
	}
}

const currentStep = computed(() => {
	return steps[current.value];
});

const onOpenNDV = () => {
	current.value = 2;
};

const onNewCred = () => {
	current.value = 3;
};

const onContinue = () => {
	if (preview) {
		preview.value.save();
	}
};

const onCredFilled = () => {
	current.value = 4;
};

const onCredUnFilled = () => {
	current.value = 3;
};

const onCredConnected = () => {
	current.value = 5;
};

const onCredSaved = () => {
	current.value = 6;
};

const onParamsCompleted = () => {
	current.value = 7;
};

const onSuccess = () => {
	current.value = 8;
};

const onWorflowSaved = ({ id }) => {
	router.push(`/workflow/${id}`);
};
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
			<WorkflowPreview
				:nodes="kickoff"
				@open-ndv="onOpenNDV"
				@new-cred="onNewCred"
				@workflow-saved="onWorflowSaved"
				@cred-filled="onCredFilled"
				@cred-unfilled="onCredUnFilled"
				@cred-connected="onCredConnected"
				@cred-saved="onCredSaved"
				@ran-node="onSuccess"
				@params-completed="onParamsCompleted"
				ref="preview"
			/>
			<div :class="$style.panel">
				<div :class="$style.icon">
					<font-awesome-icon icon="question-circle" />
				</div>
				<div :class="$style.title">{{ currentStep.panel?.title }}</div>
				<div :class="$style.desc" v-html="currentStep.panel?.desc"></div>
				<div v-if="currentStep.resources">
					<div :class="$style.resourcesTitle">Helpful Resources</div>
					<div v-for="res in currentStep.resources" :key="res.title">
						<a :class="$style.resource" :href="res.href" target="_blank">
							<div :class="$style.resourceIcon">
								<font-awesome-icon v-if="res.type === 'forum'" icon="comments" />
								<svg
									width="20"
									height="13"
									viewBox="0 0 20 13"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									v-else-if="res.type === 'youtube'"
								>
									<path
										d="M18.666 2.27539C18.4668 1.47852 17.836 0.847656 17.0723 0.648438C15.6446 0.25 10 0.25 10 0.25C10 0.25 4.3223 0.25 2.89456 0.648438C2.13089 0.847656 1.50003 1.47852 1.30081 2.27539C0.902374 3.66992 0.902374 6.6582 0.902374 6.6582C0.902374 6.6582 0.902374 9.61328 1.30081 11.041C1.50003 11.8379 2.13089 12.4355 2.89456 12.6348C4.3223 13 10 13 10 13C10 13 15.6446 13 17.0723 12.6348C17.836 12.4355 18.4668 11.8379 18.666 11.041C19.0645 9.61328 19.0645 6.6582 19.0645 6.6582C19.0645 6.6582 19.0645 3.66992 18.666 2.27539ZM8.14066 9.34766V3.96875L12.8555 6.6582L8.14066 9.34766Z"
										fill="#7D838F"
									/>
								</svg>
								<font-awesome-icon v-else icon="book" />
							</div>
							<div :class="$style.resourceInfo">
								<h3>{{ res.title }}</h3>
								<h4 v-if="res.desc">{{ res.desc }}</h4>
							</div>
						</a>
					</div>
				</div>
				<div v-if="currentStep.action">
					<n8n-button size="large" @click="onContinue">{{ currentStep.action.title }}</n8n-button>
				</div>
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

.resource {
	border: 1px solid #dbdfe7;
	border-radius: 4px;
	display: flex;
	margin-bottom: 8px;
	cursor: pointer;
}

.resourceIcon {
	padding: 20px 16px;
	color: #7d838f;
}

.resourceInfo {
	display: flex;
	flex-direction: column;
	justify-content: center;

	h3 {
		font-weight: 600;
		font-size: 14px;
		line-height: 18px;
		color: #555555;
	}

	h4 {
		font-weight: 400;
		font-size: 12px;
		line-height: 16px;
		color: #7d7d87;
	}
}

.resourcesTitle {
	margin-bottom: 8px;
}

.icon {
	margin-bottom: 16px;
	color: #c6c8d0;
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
	margin-bottom: 40px;
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
