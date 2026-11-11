import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nText from '../N8nText/Text.vue';
import {
	N8nAccordion,
	N8nAccordionContent,
	N8nAccordionHeader,
	N8nAccordionItem,
	N8nAccordionTrigger,
} from './index';

type DemoItem = {
	value: string;
	title: string;
	body: string;
	meta?: string;
	disabled?: boolean;
};

const sections: DemoItem[] = [
	{
		value: 'one',
		title: 'First section',
		body: 'Details for the first section.',
	},
	{
		value: 'two',
		title: 'Second section',
		body: 'Details for the second section.',
	},
	{
		value: 'three',
		title: 'Third section',
		body: 'Details for the third section.',
	},
];

const reviewSections: DemoItem[] = [
	{
		value: 'contacts',
		title: 'Sync contacts',
		body: '3 nodes changed in this workflow.',
		meta: 'Version 4',
	},
	{
		value: 'digest',
		title: 'Send digest',
		body: '1 node changed in this workflow.',
		meta: 'Version 2',
	},
	{
		value: 'backup',
		title: 'Backup database',
		body: 'No changes in this workflow.',
		meta: 'Version 8',
	},
];

type Story = StoryObj;

type AccordionStoryOptions = {
	rootAttrs: string;
	items?: DemoItem[];
	before?: string;
	trigger?: 'label' | 'meta';
	setup?: () => Record<string, unknown>;
};

function createRender(options: AccordionStoryOptions): Story['render'] {
	const items = options.items ?? sections;
	const trigger =
		options.trigger === 'meta'
			? `
				<N8nAccordionTrigger>
					<N8nText bold size="small">{{ item.title }}</N8nText>
					<N8nText v-if="item.meta" size="small" color="text-light" style="margin-left: auto;">
						{{ item.meta }}
					</N8nText>
				</N8nAccordionTrigger>`
			: `
				<N8nAccordionTrigger>{{ item.title }}</N8nAccordionTrigger>`;

	return function renderAccordionStory() {
		return {
			components: {
				N8nAccordion,
				N8nAccordionItem,
				N8nAccordionHeader,
				N8nAccordionTrigger,
				N8nAccordionContent,
				N8nText,
			},
			setup: function setupAccordionStory() {
				return { items, ...(options.setup?.() ?? {}) };
			},
			template: `
				${options.before ?? ''}
				<N8nAccordion ${options.rootAttrs}>
					<N8nAccordionItem
						v-for="item in items"
						:key="item.value"
						:value="item.value"
						:disabled="item.disabled"
					>
						<N8nAccordionHeader>
							${trigger}
						</N8nAccordionHeader>
						<N8nAccordionContent>
							{{ item.body }}
						</N8nAccordionContent>
					</N8nAccordionItem>
				</N8nAccordion>
			`,
		};
	};
}

function storyDescription(story: string): Story['parameters'] {
	return {
		docs: {
			description: { story },
		},
	};
}

const meta: Meta = {
	title: 'Core/Accordion',
	parameters: {
		docs: {
			description: {
				component:
					'Styled accordion. The trigger includes the chevron. ' +
					'Use N8nInfoAccordion for one information block. ' +
					'Use N8nCollapsiblePanel for one titled panel. ' +
					'See component-accordion.md for the public API.',
			},
		},
	},
	decorators: [
		function withAccordionFrame() {
			return {
				template: '<div style="padding: var(--spacing--md);"><story /></div>',
			};
		},
	],
};

export default meta;

export const Single: Story = {
	parameters: storyDescription(
		'One section stays open. A click on the open trigger does not close it.',
	),
	render: createRender({
		rootAttrs: 'type="single" default-value="one"',
	}),
};

export const SingleCollapsible: Story = {
	name: 'Single, collapsible',
	parameters: storyDescription('One section stays open. A click on the open trigger closes it.'),
	render: createRender({
		rootAttrs: 'type="single" collapsible default-value="one"',
	}),
};

export const Multiple: Story = {
	parameters: storyDescription('More than one section can stay open.'),
	render: createRender({
		rootAttrs: 'type="multiple" :default-value="defaultValue"',
		setup: function setupMultiple() {
			return { defaultValue: ['one'] };
		},
	}),
};

export const Controlled: Story = {
	parameters: storyDescription(
		'The parent owns the open value with v-model. The line above shows that value.',
	),
	render: createRender({
		rootAttrs: 'v-model="expanded" type="single" collapsible',
		before: `
			<N8nText
				size="small"
				color="text-light"
				style="display: block; margin-bottom: var(--spacing--xs);"
			>
				Open section: {{ expanded || 'None' }}
			</N8nText>
		`,
		setup: function setupControlled() {
			const expanded = ref('one');
			return { expanded };
		},
	}),
};

export const Disabled: Story = {
	parameters: storyDescription('The accordion ignores clicks.'),
	render: createRender({
		rootAttrs: 'type="single" collapsible default-value="one" disabled',
	}),
};

export const DisabledItem: Story = {
	name: 'Disabled item',
	parameters: storyDescription('One section ignores clicks. The other sections still open.'),
	render: createRender({
		rootAttrs: 'type="single" collapsible default-value="one"',
		items: sections.map((item) =>
			item.value === 'two' ? { ...item, title: 'Second section (disabled)', disabled: true } : item,
		),
	}),
};

export const Horizontal: Story = {
	parameters: storyDescription(
		'The sections sit in a row. ArrowLeft and ArrowRight move focus between triggers.',
	),
	render: createRender({
		rootAttrs: 'type="single" collapsible default-value="one" orientation="horizontal"',
	}),
};

export const CustomTrigger: Story = {
	name: 'Custom trigger',
	parameters: storyDescription(
		'The trigger slot holds the section name and extra text. The chevron stays on the trigger.',
	),
	render: createRender({
		rootAttrs: 'type="single" collapsible default-value="contacts"',
		items: reviewSections,
		trigger: 'meta',
	}),
};

export const StartsClosed: Story = {
	name: 'Starts closed',
	parameters: storyDescription(
		'No section is open. Omit default-value so every section starts closed.',
	),
	render: createRender({
		rootAttrs: 'type="single" collapsible',
	}),
};

export const KeepMounted: Story = {
	name: 'Content stays mounted',
	parameters: storyDescription('Closed content stays in the page when unmount-on-hide is false.'),
	render: createRender({
		rootAttrs: 'type="single" collapsible default-value="one" :unmount-on-hide="false"',
		before: `
			<N8nText
				size="small"
				color="text-light"
				style="display: block; margin-bottom: var(--spacing--xs);"
			>
				Closed sections stay in the page.
			</N8nText>
		`,
	}),
};
