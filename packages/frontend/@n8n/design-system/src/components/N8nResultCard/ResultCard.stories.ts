import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import '../../css/_tokens.scss';

import { DEMO_CARDS } from './demoCards';
import type { ResultCardData, ResultCardFooter, ResultCardIcon } from './ResultCard.types';
import N8nResultCard from './ResultCard.vue';

export default {
	title: 'Areas/Chat/ResultCard',
	component: N8nResultCard,
	parameters: {
		docs: {
			description: {
				component:
					'A glanceable card showing what a workflow run produced. One tinted surface per card (a finite tone palette resolved from the service or the archetype), a hero sentence, a body that resembles the service, node icons as provenance, and an entrance choreography.',
			},
		},
	},
};

const column = (inner: string) =>
	`<div style="width: 400px; max-width: 100%; display: flex; flex-direction: column; gap: 16px;">${inner}</div>`;

const Template: StoryFn = (args) => ({
	components: { N8nResultCard },
	setup: () => ({ args }),
	template: column('<N8nResultCard v-bind="args" />'),
});

const BOT: ResultCardIcon = { type: 'icon', name: 'bot' };
const MAIL: ResultCardIcon = { type: 'icon', name: 'mail' };
const TABLE: ResultCardIcon = { type: 'icon', name: 'table' };

interface GalleryEntry {
	card: ResultCardData;
	footer: ResultCardFooter;
	icons: ResultCardIcon[];
}

const CLOUD: ResultCardIcon = { type: 'icon', name: 'cloud' };

const GALLERY: GalleryEntry[] = [
	{
		card: DEMO_CARDS.weather,
		footer: { workflowName: 'Weather check', time: '12:40' },
		icons: [CLOUD, BOT],
	},
	{
		card: DEMO_CARDS.metric,
		footer: { workflowName: 'Leads log', time: '09:32' },
		icons: [BOT, TABLE],
	},
	{
		card: DEMO_CARDS.metricTrend,
		footer: { workflowName: 'Team pulse', time: '08:00' },
		icons: [BOT, MAIL],
	},
	{
		card: DEMO_CARDS.email,
		footer: { workflowName: 'Inbox assistant', time: '12:04' },
		icons: [BOT, MAIL, TABLE],
	},
	{
		card: DEMO_CARDS.recordsMany,
		footer: { workflowName: 'Leads log', time: '09:31' },
		icons: [BOT, TABLE],
	},
	{
		card: DEMO_CARDS.slack,
		footer: { workflowName: 'Team channel summary', time: '07:30' },
		icons: [BOT, MAIL, TABLE],
	},
	{
		card: DEMO_CARDS.telegram,
		footer: { workflowName: 'Match tracker', time: '13:10' },
		icons: [BOT, MAIL],
	},
	{
		card: DEMO_CARDS.list,
		footer: { workflowName: 'Review queue', time: '10:15' },
		icons: [BOT, TABLE],
	},
	{
		card: DEMO_CARDS.keyValue,
		footer: { workflowName: 'Match tracker', time: '13:05' },
		icons: [BOT, TABLE],
	},
	{
		card: DEMO_CARDS.keyValuePaper,
		footer: { workflowName: 'Match tracker', time: '13:05' },
		icons: [BOT, TABLE, MAIL],
	},
];

const galleryTemplate = (extra = '') =>
	column(
		`<N8nResultCard v-for="(entry, index) in entries" :key="index" :card="entry.card" :footer="entry.footer" :icons="entry.icons" ${extra} />`,
	);

export const Weather = Template.bind({});
Weather.args = {
	card: DEMO_CARDS.weather,
	footer: { workflowName: 'Weather check', time: '12:40' },
	icons: [CLOUD, BOT],
};

export const Metric = Template.bind({});
Metric.args = {
	card: DEMO_CARDS.metric,
	footer: { workflowName: 'Leads log', time: '09:32' },
	icons: [BOT, TABLE],
};

export const MetricTrend = Template.bind({});
MetricTrend.args = {
	card: DEMO_CARDS.metricTrend,
	footer: { workflowName: 'Team pulse', time: '08:00' },
	icons: [BOT, MAIL],
};

export const Gmail = Template.bind({});
Gmail.args = {
	card: DEMO_CARDS.email,
	footer: { workflowName: 'Inbox assistant', time: '12:04' },
	icons: [BOT, MAIL],
	executionLink: true,
};

export const GoogleSheets = Template.bind({});
GoogleSheets.args = {
	card: DEMO_CARDS.recordsMany,
	footer: { workflowName: 'Leads log', time: '09:31' },
	icons: [BOT, TABLE],
};

export const Slack = Template.bind({});
Slack.args = {
	card: DEMO_CARDS.slack,
	footer: { workflowName: 'Team channel summary', time: '07:30' },
	icons: [BOT, MAIL, TABLE],
};

export const Telegram = Template.bind({});
Telegram.args = {
	card: DEMO_CARDS.telegram,
	footer: { workflowName: 'Match tracker', time: '13:10' },
	icons: [BOT, MAIL],
};

export const List = Template.bind({});
List.args = {
	card: DEMO_CARDS.list,
	footer: { workflowName: 'Review queue', time: '10:15' },
	icons: [BOT, TABLE],
};

export const KeyValueCover = Template.bind({});
KeyValueCover.args = {
	card: DEMO_CARDS.keyValue,
	footer: { workflowName: 'Match tracker', time: '13:05' },
	icons: [BOT, TABLE],
};

export const KeyValuePaper = Template.bind({});
KeyValuePaper.args = {
	card: DEMO_CARDS.keyValuePaper,
	footer: { workflowName: 'Match tracker', time: '13:05' },
	icons: [BOT, TABLE],
};

export const AllCards: StoryFn = () => ({
	components: { N8nResultCard },
	setup: () => ({ entries: GALLERY }),
	template: galleryTemplate(),
});

export const AllCardsDark: StoryFn = () => ({
	components: { N8nResultCard },
	setup: () => ({ entries: GALLERY }),
	template: `<div data-theme="dark" style="background: var(--background--subtle); padding: 16px;">${galleryTemplate()}</div>`,
});

/** Every card in its final state — no entrance motion (what tests and visual snapshots see). */
export const Static: StoryFn = () => ({
	components: { N8nResultCard },
	setup: () => ({ entries: GALLERY }),
	template: galleryTemplate(':animated="false"'),
});

/** Re-mounts the cards on demand so the entrance choreography can be watched again. */
export const Replay: StoryFn = () => ({
	components: { N8nResultCard },
	setup: () => {
		const generation = ref(0);
		const replay = () => {
			generation.value += 1;
		};
		return { entries: GALLERY, generation, replay };
	},
	template: `<div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
		<button type="button" style="padding: 8px 16px; border: 0; border-radius: 9999px; background: var(--color--primary); color: #fff; font: inherit; cursor: pointer;" @click="replay">
			Replay entrance
		</button>
		${column(
			'<N8nResultCard v-for="(entry, index) in entries" :key="generation + \'-\' + index" :card="entry.card" :footer="entry.footer" :icons="entry.icons" />',
		)}
	</div>`,
});
