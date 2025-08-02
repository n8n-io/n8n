import type { StoryFn } from '@storybook/vue3';

import N8nSuggestedActions from './SuggestedActions.vue';

export default {
	title: 'Modules/SuggestedActions',
	component: N8nSuggestedActions,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup() {
		return { args };
	},
	props: Object.keys(argTypes),
	components: {
		N8nSuggestedActions,
	},
	template: `
		<div style="padding: 50px;">
			<N8nSuggestedActions v-bind="args" @action-click="onActionClick" @ignore-click="onIgnoreClick" />
		</div>
	`,
	methods: {
		onActionClick(actionId: string) {
			console.log('Action clicked:', actionId);
			alert(`Action clicked: ${actionId}`);
		},
		onIgnoreClick(actionId: string) {
			console.log('Ignore clicked:', actionId);
			alert(`Ignore clicked: ${actionId}`);
		},
	},
});

export const Default = Template.bind({});
Default.args = {
	actions: [
		{
			id: 'evaluate-workflow',
			title: 'Evaluate your workflow with a dataset',
			description: 'Set up an AI evaluation to be sure th WF is reliable.',
			moreInfoLink: 'https://docs.n8n.io/evaluations',
			buttonLabel: 'Go to evaluations',
		},
		{
			id: 'track-errors',
			title: 'Keep track of execution errors',
			description: 'Setup a workflow error to track what is going on here.',
			moreInfoLink: 'https://docs.n8n.io/error-workflows',
			buttonLabel: 'Settings',
		},
		{
			id: 'track-time',
			title: 'Track the time you save',
			description:
				'Log how much time this workflow saves each run to measure your automation impact.',
			buttonLabel: 'Settings',
		},
	],
};

export const WithoutMoreInfoLinks = Template.bind({});
WithoutMoreInfoLinks.args = {
	actions: [
		{
			id: 'action-1',
			title: 'Action without more info link',
			description: 'This action does not have a more info link.',
			buttonLabel: 'Do something',
		},
		{
			id: 'action-2',
			title: 'Another action',
			description: 'This one also lacks a more info link.',
			buttonLabel: 'Do another thing',
		},
	],
};

export const LongContent = Template.bind({});
LongContent.args = {
	actions: Array.from({ length: 10 }, (_, i) => ({
		id: `action-${i + 1}`,
		title: `Suggested Action ${i + 1}`,
		description: `This is a longer description for action ${i + 1} that demonstrates how the component handles scrolling when there are many items in the list.`,
		moreInfoLink: i % 2 === 0 ? 'https://docs.n8n.io' : undefined,
		buttonLabel: `Action ${i + 1}`,
	})),
};

const TemplateWithEvents: StoryFn = (args, { argTypes }) => ({
	setup() {
		return { args };
	},
	props: Object.keys(argTypes),
	components: {
		N8nSuggestedActions,
	},
	template: `
		<div style="padding: 50px;">
			<N8nSuggestedActions
				v-bind="args"
				@action-click="onActionClick"
				@ignore-click="onIgnoreClick"
				@ignore-all="onIgnoreAll"
			/>
		</div>
	`,
	methods: {
		onActionClick(actionId: string) {
			console.log('Action clicked:', actionId);
			alert(`Action clicked: ${actionId}`);
		},
		onIgnoreClick(actionId: string) {
			console.log('Ignore clicked:', actionId);
			alert(`Ignore clicked: ${actionId}`);
		},
		onIgnoreAll() {
			console.log('Ignore all clicked');
			alert('Ignore all clicked');
		},
	},
});

export const WithIgnoreAllOption = TemplateWithEvents.bind({});
WithIgnoreAllOption.args = {
	ignoreAllLabel: 'Ignore for all workflows',
	actions: [
		{
			id: 'evaluate-workflow',
			title: 'Evaluate your workflow with a dataset',
			description: 'Set up an AI evaluation to be sure th WF is reliable.',
			moreInfoLink: 'https://docs.n8n.io/evaluations',
			buttonLabel: 'Go to evaluations',
		},
		{
			id: 'track-errors',
			title: 'Keep track of execution errors',
			description: 'Setup a workflow error to track what is going on here.',
			moreInfoLink: 'https://docs.n8n.io/error-workflows',
			buttonLabel: 'Settings',
		},
	],
};

export const SingleActionWithTurnOff = TemplateWithEvents.bind({});
SingleActionWithTurnOff.args = {
	ignoreAllLabel: 'Disable all suggestions',
	actions: [
		{
			id: 'single-action',
			title: 'Single action with turn off option',
			description: 'This shows how the turn off option appears even with a single action.',
			buttonLabel: 'Take action',
		},
	],
};

const AlignmentTemplate: StoryFn = (args, { argTypes }) => ({
	setup() {
		return { args };
	},
	props: Object.keys(argTypes),
	components: {
		N8nSuggestedActions,
	},
	template: `
		<div style="padding: 50px; display: flex; justify-content: space-between; width: 800px;">
			<div>
				<h4 style="margin-bottom: 10px;">Start Alignment</h4>
				<N8nSuggestedActions v-bind="args" popoverAlignment="start" />
			</div>
			<div>
				<h4 style="margin-bottom: 10px;">Center Alignment</h4>
				<N8nSuggestedActions v-bind="args" popoverAlignment="center" />
			</div>
			<div>
				<h4 style="margin-bottom: 10px;">End Alignment</h4>
				<N8nSuggestedActions v-bind="args" popoverAlignment="end" />
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
			buttonLabel: 'Action',
		},
	],
};

export const MultipleActionsWithIgnoreAll = TemplateWithEvents.bind({});
MultipleActionsWithIgnoreAll.args = {
	actions: [
		{
			id: 'action1',
			title: 'First action',
			description: 'This is the first action that can be ignored.',
			buttonLabel: 'Do first thing',
			completed: true,
		},
		{
			id: 'action2',
			title: 'Second action',
			description: 'This is the second action that can be ignored.',
			buttonLabel: 'Do second thing',
		},
		{
			id: 'action3',
			title: 'Third action',
			description: 'This is the third action that can be ignored.',
			buttonLabel: 'Do third thing',
		},
	],
};
