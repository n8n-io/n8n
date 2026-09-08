import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nHeading from './Heading.vue';

const meta = {
	title: 'Core/Heading',
	component: N8nHeading,
	argTypes: {
		step: {
			control: 'select',
			options: [undefined, '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
		},
		size: {
			control: 'select',
			options: ['2xlarge', 'xlarge', 'large', 'medium', 'small'],
		},
		color: {
			control: 'select',
			options: ['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight', 'danger'],
		},
	},
	parameters: {
		docs: {
			description: { component: 'A typographic heading component for section and page titles.' },
		},
	},
} satisfies Meta<typeof N8nHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nHeading },
		setup() {
			return { args };
		},
		template: '<N8nHeading v-bind="args">hello world</N8nHeading>',
	}),
	args: {
		size: 'medium',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nHeading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<N8nHeading size="2xlarge">2XLarge heading</N8nHeading>
				<N8nHeading size="xlarge">XLarge heading</N8nHeading>
				<N8nHeading size="large">Large heading</N8nHeading>
				<N8nHeading size="medium">Medium heading</N8nHeading>
				<N8nHeading size="small">Small heading</N8nHeading>
			</div>
		`,
	}),
};

export const Variants: Story = {
	render: () => ({
		components: { N8nHeading },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<N8nHeading color="primary">Primary</N8nHeading>
				<N8nHeading color="text-dark">Text dark</N8nHeading>
				<N8nHeading color="text-base">Text base</N8nHeading>
				<N8nHeading color="text-light">Text light</N8nHeading>
				<N8nHeading color="text-xlight">Text xlight</N8nHeading>
				<N8nHeading color="danger">Danger</N8nHeading>
			</div>
		`,
	}),
};
