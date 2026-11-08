import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nIcon from '../N8nIcon/Icon.vue';
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

/**
 * Story-only layout. N8nAccordion is headless, so the canvas needs its own chrome
 * to show open, closed, and disabled states.
 */
const demoCss = `
.n8n-accordion-demo {
	max-width: 28rem;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;
}
.n8n-accordion-demo__header {
	margin: 0;
}
.n8n-accordion-demo__trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	text-align: left;
	cursor: pointer;
}
.n8n-accordion-demo__trigger:focus-visible {
	outline: var(--focus--border-width) solid var(--focus--outline-color);
	outline-offset: calc(-1 * var(--focus--border-width));
}
.n8n-accordion-demo__trigger[data-disabled] {
	color: var(--text-color--disabled);
	cursor: not-allowed;
}
.n8n-accordion-demo:not(.n8n-accordion-demo--horizontal) .n8n-accordion-demo__item + .n8n-accordion-demo__item {
	border-top: var(--border);
}
.n8n-accordion-demo:not(.n8n-accordion-demo--horizontal) .n8n-accordion-demo__trigger[data-state='open'] {
	border-bottom: var(--border);
}
.n8n-accordion-demo__label {
	min-width: 0;
}
.n8n-accordion-demo__chevron {
	display: inline-flex;
	margin-left: auto;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform var(--duration--snappy) ease;
}
.n8n-accordion-demo__chevron--leading {
	margin-left: 0;
}
.n8n-accordion-demo__trigger[data-state='closed'] .n8n-accordion-demo__chevron {
	transform: rotate(-90deg);
}
.n8n-accordion-demo__meta {
	margin-left: auto;
	flex-shrink: 0;
}
.n8n-accordion-demo__content {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}
.n8n-accordion-demo__content[data-state='open'] {
	padding: var(--spacing--sm);
}
.n8n-accordion-demo__note {
	display: block;
	margin-bottom: var(--spacing--xs);
}
.n8n-accordion-demo--horizontal {
	display: flex;
	align-items: flex-start;
	max-width: none;
}
.n8n-accordion-demo--horizontal .n8n-accordion-demo__item {
	border-right: var(--border);
}
.n8n-accordion-demo--horizontal .n8n-accordion-demo__item:last-child {
	border-right: 0;
}
.n8n-accordion-demo--horizontal .n8n-accordion-demo__trigger {
	width: auto;
}
.n8n-accordion-demo--horizontal .n8n-accordion-demo__content {
	width: 16rem;
}
`;

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
	// N8nIcon does not forward class to its svg, so the rotation target is a span.
	const trigger =
		options.trigger === 'meta'
			? `
				<N8nAccordionTrigger class="n8n-accordion-demo__trigger">
					<span class="n8n-accordion-demo__chevron n8n-accordion-demo__chevron--leading">
						<N8nIcon icon="chevron-down" size="small" />
					</span>
					<N8nText bold size="small" class="n8n-accordion-demo__label">{{ item.title }}</N8nText>
					<N8nText v-if="item.meta" size="small" color="text-light" class="n8n-accordion-demo__meta">{{ item.meta }}</N8nText>
				</N8nAccordionTrigger>`
			: `
				<N8nAccordionTrigger class="n8n-accordion-demo__trigger">
					<N8nText size="small" class="n8n-accordion-demo__label">{{ item.title }}</N8nText>
					<span class="n8n-accordion-demo__chevron">
						<N8nIcon icon="chevron-down" size="small" />
					</span>
				</N8nAccordionTrigger>`;

	return function renderAccordionStory() {
		return {
			components: {
				N8nAccordion,
				N8nAccordionItem,
				N8nAccordionHeader,
				N8nAccordionTrigger,
				N8nAccordionContent,
				N8nIcon,
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
						class="n8n-accordion-demo__item"
					>
						<N8nAccordionHeader class="n8n-accordion-demo__header">
							${trigger}
						</N8nAccordionHeader>
						<N8nAccordionContent class="n8n-accordion-demo__content">
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

/**
 * AccordionRoot is a generic reka-ui component. Storybook Meta.component
 * rejects that shape, so keep the story typed as a plain Meta.
 */
const meta: Meta = {
	title: 'Core/Accordion',
	parameters: {
		docs: {
			description: {
				component:
					'Headless accordion primitives. Compose N8nAccordion, N8nAccordionItem, N8nAccordionHeader, N8nAccordionTrigger, and N8nAccordionContent. Product code owns the layout and the styles. Use N8nInfoAccordion for one information block. Use N8nCollapsiblePanel for one titled panel. See component-accordion.md for the public API.',
			},
		},
	},
	decorators: [
		function withAccordionDemoFrame() {
			return {
				template: `
					<div style="padding: var(--spacing--md);">
						<component is="style">${demoCss}</component>
						<story />
					</div>
				`,
			};
		},
	],
};

export default meta;

const demoClass = 'class="n8n-accordion-demo"';
const horizontalClass = 'class="n8n-accordion-demo n8n-accordion-demo--horizontal"';

export const Single: Story = {
	parameters: storyDescription(
		'One section stays open. A click on the open trigger does not close it.',
	),
	render: createRender({
		rootAttrs: `type="single" default-value="one" ${demoClass}`,
	}),
};

export const SingleCollapsible: Story = {
	name: 'Single, collapsible',
	parameters: storyDescription('One section stays open. A click on the open trigger closes it.'),
	render: createRender({
		rootAttrs: `type="single" collapsible default-value="one" ${demoClass}`,
	}),
};

export const Multiple: Story = {
	parameters: storyDescription('More than one section can stay open.'),
	render: createRender({
		rootAttrs: `type="multiple" :default-value="defaultValue" ${demoClass}`,
		setup: function setupMultiple() {
			return { defaultValue: ['one'] };
		},
	}),
};

export const Controlled: Story = {
	parameters: storyDescription(
		'The parent owns the open value with v-model. The line above the accordion shows that value.',
	),
	render: createRender({
		rootAttrs: `v-model="expanded" type="single" collapsible ${demoClass}`,
		before: `
			<N8nText size="small" color="text-light" class="n8n-accordion-demo__note">
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
		rootAttrs: `type="single" collapsible default-value="one" disabled ${demoClass}`,
	}),
};

export const DisabledItem: Story = {
	name: 'Disabled item',
	parameters: storyDescription('One section ignores clicks. The other sections still open.'),
	render: createRender({
		rootAttrs: `type="single" collapsible default-value="one" ${demoClass}`,
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
		rootAttrs: `type="single" collapsible default-value="one" orientation="horizontal" ${horizontalClass}`,
	}),
};

export const CustomTrigger: Story = {
	name: 'Custom trigger',
	parameters: storyDescription(
		'The trigger can hold an icon, a label, and extra text. Product code owns this layout.',
	),
	render: createRender({
		rootAttrs: `type="single" collapsible default-value="contacts" ${demoClass}`,
		items: reviewSections,
		trigger: 'meta',
	}),
};

export const KeepMounted: Story = {
	name: 'Content stays mounted',
	parameters: storyDescription(
		'Closed content stays in the page. Set unmount-on-hide to false when closed text must stay available.',
	),
	render: createRender({
		rootAttrs: `type="single" collapsible default-value="one" :unmount-on-hide="false" ${demoClass}`,
		before: `
			<N8nText size="small" color="text-light" class="n8n-accordion-demo__note">
				Closed sections stay in the page.
			</N8nText>
		`,
	}),
};
