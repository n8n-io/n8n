import type { StoryFn } from '@storybook/vue3-vite';

import '../../css/_tokens.scss';

import { DEMO_CARDS } from './demoCards';
import N8nResultCard from './ResultCard.vue';

export default {
	title: 'Areas/Chat/ResultCard',
	component: N8nResultCard,
	parameters: {
		docs: {
			description: {
				component:
					'A glanceable card showing what a workflow run produced. One shell, six archetype bodies, service skins resolved from the node type.',
			},
		},
	},
};

const column = (inner: string) =>
	`<div style="width: 480px; max-width: 100%; display: flex; flex-direction: column; gap: 12px;">${inner}</div>`;

const Template: StoryFn = (args) => ({
	components: { N8nResultCard },
	setup: () => ({ args }),
	template: column('<N8nResultCard v-bind="args" />'),
});

export const Gmail = Template.bind({});
Gmail.args = {
	card: DEMO_CARDS.email,
	footer: { workflowName: 'Inbox assistant', time: '12:04' },
	executionLink: true,
};

export const GoogleSheets = Template.bind({});
GoogleSheets.args = {
	card: DEMO_CARDS.recordsMany,
	footer: { workflowName: 'Leads log', time: '09:31' },
};

export const Metric = Template.bind({});
Metric.args = { card: DEMO_CARDS.metric, footer: { workflowName: 'Leads log', time: '09:32' } };

export const Slack = Template.bind({});
Slack.args = {
	card: DEMO_CARDS.slack,
	footer: { workflowName: 'Team channel summary', time: '07:30' },
};

export const Telegram = Template.bind({});
Telegram.args = {
	card: DEMO_CARDS.telegram,
	footer: { workflowName: 'Match tracker', time: '13:10' },
};

export const List = Template.bind({});
List.args = { card: DEMO_CARDS.list };

export const KeyValue = Template.bind({});
KeyValue.args = { card: DEMO_CARDS.keyValue };

export const AllCards: StoryFn = () => ({
	components: { N8nResultCard },
	setup: () => ({ cards: Object.values(DEMO_CARDS) }),
	template: column('<N8nResultCard v-for="card in cards" :key="card.title" :card="card" />'),
});

export const AllCardsDark: StoryFn = () => ({
	components: { N8nResultCard },
	setup: () => ({ cards: Object.values(DEMO_CARDS) }),
	template: `<div data-theme="dark" style="background: var(--background--subtle); padding: 16px;">${column(
		'<N8nResultCard v-for="card in cards" :key="card.title" :card="card" />',
	)}</div>`,
});

export const LongContent = Template.bind({});
LongContent.args = {
	card: {
		...DEMO_CARDS.email,
		title:
			'Sent to a recipient whose display name is unreasonably long for a single line of a card title',
		to: [
			'one@example.com',
			'two@example.com',
			'three@example.com',
			'four@example.com',
			'five@example.com',
		],
		subject: 'Re: '.repeat(20) + 'Quarterly numbers',
		preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(6),
	},
};
