import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nButtonList from './ButtonList.vue';
import N8nButton from '../N8nButton/Button.vue';
import N8nIconButton from '../N8nIconButton/IconButton.vue';

const meta = {
	title: 'Core/ButtonList',
	component: N8nButtonList,
	parameters: {
		docs: {
			description: {
				component:
					'Layout wrapper that applies consistent spacing between a group of buttons or icon buttons.',
			},
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
			description: 'Layout orientation of the buttons',
		},
	},
} satisfies Meta<typeof N8nButtonList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nButtonList, N8nButton },
		setup() {
			return { args };
		},
		template: `
			<N8nButtonList v-bind="args">
				<N8nButton variant="subtle">Save</N8nButton>
				<N8nButton variant="solid">Publish</N8nButton>
				<N8nButton variant="ghost">More</N8nButton>
			</N8nButtonList>
		`,
	}),
	args: {
		orientation: 'horizontal',
	},
};

export const IconButtons: Story = {
	render: (args) => ({
		components: { N8nButtonList, N8nIconButton },
		setup() {
			return { args };
		},
		template: `
			<N8nButtonList v-bind="args">
				<N8nIconButton variant="subtle" size="large" icon="maximize" aria-label="Zoom to fit" />
				<N8nIconButton variant="subtle" size="large" icon="zoom-in" aria-label="Zoom in" />
				<N8nIconButton variant="subtle" size="large" icon="zoom-out" aria-label="Zoom out" />
			</N8nButtonList>
		`,
	}),
	args: {
		orientation: 'horizontal',
	},
};

export const Vertical: Story = {
	render: (args) => ({
		components: { N8nButtonList, N8nIconButton },
		setup() {
			return { args };
		},
		template: `
			<N8nButtonList v-bind="args">
				<N8nIconButton variant="subtle" size="large" icon="plus" aria-label="Add" />
				<N8nIconButton variant="subtle" size="large" icon="search" aria-label="Search" />
				<N8nIconButton variant="subtle" size="large" icon="sticky-note" aria-label="Sticky note" />
			</N8nButtonList>
		`,
	}),
	args: {
		orientation: 'vertical',
	},
};
