import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import type { SuggestedActionsProps } from './SuggestedActions.vue';
import N8nSuggestedActions from './SuggestedActions.vue';

export default {
	title: 'Core/SuggestedActions',
	component: N8nSuggestedActions,
	argTypes: {
		open: {
			control: 'boolean',
			description: 'Controls whether the popover is open',
		},
	},

	parameters: {
		docs: {
			description: {
				component: 'A list of suggested next actions with optional metadata and controls.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup() {
		const isOpen = ref(false);

		const onActionClick = (actionId: string) => {
			console.log('Action clicked:', actionId);
			alert(`Action clicked: ${actionId}`);
		};

		const onUpdateOpen = (open: boolean) => {
			console.log('Open state changed:', open);
			isOpen.value = open;
		};

		return {
			args,
			isOpen,
			onActionClick,
			onUpdateOpen,
		};
	},
	props: Object.keys(argTypes),
	components: {
		N8nSuggestedActions,
	},
	template: `
		<div>
			<p style="margin-bottom: 20px;">Popover is: {{ isOpen ? 'Open' : 'Closed' }}</p>
			<N8nSuggestedActions
				v-bind="args"
				v-model:open="isOpen"
				@action-click="onActionClick"
			/>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {
	actions: [
		{
			id: 'evaluate-workflow',
			title: 'Evaluate your workflow with a dataset',
			description: 'Set up an AI evaluation to be sure th WF is reliable.',
			moreInfoLink: 'https://docs.n8n.io/evaluations',
		},
		{
			id: 'track-errors',
			title: 'Keep track of execution errors',
			description: 'Setup a workflow error to track what is going on here.',
			moreInfoLink: 'https://docs.n8n.io/error-workflows',
		},
		{
			id: 'track-time',
			title: 'Track the time you save',
			description:
				'Log how much time this workflow saves each run to measure your automation impact.',
		},
	],
	title: 'Suggested Actions',
	open: false,
} satisfies SuggestedActionsProps;

export const InitiallyOpen = Template.bind({});
InitiallyOpen.args = {
	...Default.args,
	open: true,
};

export const WithoutMoreInfoLinks = Template.bind({});
WithoutMoreInfoLinks.args = {
	actions: [
		{
			id: 'action-1',
			title: 'Action without more info link',
			description: 'This action does not have a more info link.',
		},
		{
			id: 'action-2',
			title: 'Another action',
			description: 'This one also lacks a more info link.',
		},
	],
	title: 'Actions Without Links',
	open: false,
} satisfies SuggestedActionsProps;

export const LongContent = Template.bind({});
LongContent.args = {
	actions: Array.from({ length: 10 }, (_, i) => ({
		id: `action-${i + 1}`,
		title: `Suggested Action ${i + 1}`,
		description: `This is a longer description for action ${i + 1} that demonstrates how the component handles scrolling when there are many items in the list.`,
		moreInfoLink: i % 2 === 0 ? 'https://docs.n8n.io' : undefined,
	})),
	title: 'Many Actions',
	open: false,
} satisfies SuggestedActionsProps;

const AlignmentTemplate: StoryFn = (args, { argTypes }) => ({
	setup() {
		const startOpen = ref(false);
		const centerOpen = ref(false);
		const endOpen = ref(false);

		return {
			args,
			startOpen,
			centerOpen,
			endOpen,
		};
	},
	props: Object.keys(argTypes),
	components: {
		N8nSuggestedActions,
	},
	template: `
		<div style="display: flex; justify-content: space-between; width: 800px">
			<div>
				<h4 style="margin-bottom: 10px;">Start Alignment</h4>
				<p>{{ startOpen ? 'Open' : 'Closed' }}</p>
				<N8nSuggestedActions v-bind="args" v-model:open="startOpen" popoverAlignment="start" />
			</div>
			<div>
				<h4 style="margin-bottom: 10px;">Center Alignment</h4>
				<p>{{ centerOpen ? 'Open' : 'Closed' }}</p>
				<N8nSuggestedActions v-bind="args" v-model:open="centerOpen" popoverAlignment="center" />
			</div>
			<div>
				<h4 style="margin-bottom: 10px;">End Alignment</h4>
				<p>{{ endOpen ? 'Open' : 'Closed' }}</p>
				<N8nSuggestedActions v-bind="args" v-model:open="endOpen" popoverAlignment="end" />
			</div>
		</div>
	`,
});

export const PopoverAlignments = AlignmentTemplate.bind({});
PopoverAlignments.args = {
	actions: [
		{
			id: 'action1',
			title: 'Test Alignment',
			description: 'This demonstrates different popover alignments.',
		},
	],
	title: 'Alignment Demo',
	open: false,
} satisfies SuggestedActionsProps;

export const MultipleActionsWithCompleted = Template.bind({});
MultipleActionsWithCompleted.args = {
	actions: [
		{
			id: 'action1',
			title: 'First action',
			description: 'This action is already completed.',
			completed: true,
		},
		{
			id: 'action2',
			title: 'Second action',
			description: 'This is the second action.',
		},
		{
			id: 'action3',
			title: 'Third action',
			description: 'This is the third action.',
		},
	],
	title: 'Multiple Actions',
	open: false,
} satisfies SuggestedActionsProps;

const ControlledTemplate: StoryFn = (args, { argTypes }) => ({
	setup() {
		const isOpen = ref(false);

		const toggleOpen = () => {
			isOpen.value = !isOpen.value;
		};

		const forceClose = () => {
			isOpen.value = false;
		};

		const onActionClick = (actionId: string) => {
			console.log('Action clicked:', actionId);
			alert(`Action clicked: ${actionId}`);
			// Automatically close after action
			isOpen.value = false;
		};

		const onUpdateOpen = (open: boolean) => {
			console.log('External open change:', open);
			isOpen.value = open;
		};

		return {
			args,
			isOpen,
			toggleOpen,
			forceClose,
			onActionClick,
			onUpdateOpen,
		};
	},
	props: Object.keys(argTypes),
	components: {
		N8nSuggestedActions,
	},
	template: `
		<div>
			<div style="margin-bottom: 20px;">
				<button @click="toggleOpen" style="margin-right: 10px;">
					{{ isOpen ? 'Close' : 'Open' }} Popover
				</button>
				<button @click="forceClose">Force Close</button>
				<p style="margin-top: 10px;">Popover is: {{ isOpen ? 'Open' : 'Closed' }}</p>
			</div>
			<N8nSuggestedActions
				v-bind="args"
				v-model:open="isOpen"
				@action-click="onActionClick"
			/>
		</div>
	`,
});

export const ExternalControl = ControlledTemplate.bind({});
ExternalControl.args = {
	actions: [
		{
			id: 'controlled-action',
			title: 'Externally Controlled Action',
			description: 'This popover can be controlled externally via buttons above.',
		},
	],
	title: 'External Control Demo',
	open: false,
} satisfies SuggestedActionsProps;

export const WithNotice = Template.bind({});
WithNotice.args = {
	actions: [
		{
			id: 'action-with-notice',
			title: 'Action with Notice',
			description: 'This demonstrates how the notice appears in the popover.',
		},
		{
			id: 'second-action',
			title: 'Another Action',
			description: 'This shows multiple actions with a notice displayed.',
		},
	],
	title: 'Actions with Notice',
	notice: 'Read-only environment. Update these items in development and push changes.',
	open: true,
} satisfies SuggestedActionsProps;
