import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import {
	N8nAccordion,
	N8nAccordionContent,
	N8nAccordionHeader,
	N8nAccordionItem,
	N8nAccordionTrigger,
} from './index';

const meta: Meta = {
	title: 'Core/Accordion',
	component: N8nAccordion,
	parameters: {
		docs: {
			description: {
				component:
					'Headless accordion primitives. Compose Root, Item, Header, Trigger, and Content. Product code owns the layout and styles.',
			},
		},
	},
};

export default meta;

type Story = StoryObj;

export const SingleCollapsible: Story = {
	render: function renderSingleCollapsible() {
		return {
			components: {
				N8nAccordion,
				N8nAccordionItem,
				N8nAccordionHeader,
				N8nAccordionTrigger,
				N8nAccordionContent,
			},
			setup: function setup() {
				const expanded = ref('one');
				return { expanded };
			},
			template: `
				<N8nAccordion v-model="expanded" type="single" collapsible>
					<N8nAccordionItem value="one">
						<N8nAccordionHeader>
							<N8nAccordionTrigger>First section</N8nAccordionTrigger>
						</N8nAccordionHeader>
						<N8nAccordionContent>First section content</N8nAccordionContent>
					</N8nAccordionItem>
					<N8nAccordionItem value="two">
						<N8nAccordionHeader>
							<N8nAccordionTrigger>Second section</N8nAccordionTrigger>
						</N8nAccordionHeader>
						<N8nAccordionContent>Second section content</N8nAccordionContent>
					</N8nAccordionItem>
				</N8nAccordion>
			`,
		};
	},
};
