import type { StoryFn } from '@storybook/vue3';

import N8nSuggestedActions from './SuggestedActions.vue';

export default {
	title: 'Modules/SuggestedActions',
	component: N8nSuggestedActions,
	argTypes: {
		showRedDot: {
			control: { type: 'boolean' },
		},
	},
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
	showRedDot: true,
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

export const WithoutRedDot = Template.bind({});
WithoutRedDot.args = {
	showRedDot: false,
	actions: [
		{
			id: 'single-action',
			title: 'Single action example',
			description: 'This is an example with just one action and no red dot indicator.',
			buttonLabel: 'Take action',
		},
	],
};

export const WithoutMoreInfoLinks = Template.bind({});
WithoutMoreInfoLinks.args = {
	showRedDot: true,
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
	showRedDot: true,
	actions: Array.from({ length: 10 }, (_, i) => ({
		id: `action-${i + 1}`,
		title: `Suggested Action ${i + 1}`,
		description: `This is a longer description for action ${i + 1} that demonstrates how the component handles scrolling when there are many items in the list.`,
		moreInfoLink: i % 2 === 0 ? 'https://docs.n8n.io' : undefined,
		buttonLabel: `Action ${i + 1}`,
	})),
};
