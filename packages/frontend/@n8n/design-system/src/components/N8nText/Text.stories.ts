import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nText from './Text.vue';

const meta = {
	title: 'Core/Text',
	component: N8nText,
	argTypes: {
		step: {
			control: 'select',
			options: [undefined, '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
		},
		size: {
			control: 'select',
			options: ['xsmall', 'small', 'mini', 'medium', 'large', 'xlarge'],
		},
		color: {
			control: 'select',
			options: [
				'primary',
				'secondary',
				'text-dark',
				'text-base',
				'text-light',
				'text-xlight',
				'danger',
				'success',
				'warning',
				'foreground-dark',
				'foreground-xdark',
			],
		},
	},
	parameters: {
		docs: {
			description: { component: 'A typography component for styled body text and inline copy.' },
		},
	},
} satisfies Meta<typeof N8nText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nText },
		setup() {
			return { args };
		},
		template: '<N8nText v-bind="args">hello world</N8nText>',
	}),
	args: {
		size: 'medium',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<N8nText size="xsmall">XSmall text</N8nText>
				<N8nText size="small">Small text</N8nText>
				<N8nText size="mini">Mini text</N8nText>
				<N8nText size="medium">Medium text</N8nText>
				<N8nText size="large">Large text</N8nText>
				<N8nText size="xlarge">XLarge text</N8nText>
			</div>
		`,
	}),
};

export const Variants: Story = {
	render: () => ({
		components: { N8nText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<N8nText color="primary">Primary</N8nText>
				<N8nText color="secondary">Secondary</N8nText>
				<N8nText color="text-dark">Text dark</N8nText>
				<N8nText color="text-base">Text base</N8nText>
				<N8nText color="text-light">Text light</N8nText>
				<N8nText color="text-xlight">Text xlight</N8nText>
				<N8nText color="danger">Danger</N8nText>
				<N8nText color="success">Success</N8nText>
				<N8nText color="warning">Warning</N8nText>
				<N8nText color="foreground-dark">Foreground dark</N8nText>
				<N8nText color="foreground-xdark">Foreground xdark</N8nText>
			</div>
		`,
	}),
};

export const Steps: Story = {
	render: () => ({
		components: { N8nText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<N8nText step="4xs">4xs text</N8nText>
				<N8nText step="3xs">3xs text</N8nText>
				<N8nText step="2xs">2xs text</N8nText>
				<N8nText step="xs">xs text</N8nText>
				<N8nText step="sm">sm text</N8nText>
				<N8nText step="md">md text</N8nText>
				<N8nText step="lg">lg text</N8nText>
				<N8nText step="xl">xl text</N8nText>
				<N8nText step="2xl">2xl text</N8nText>
			</div>
		`,
	}),
};

export const Weights: Story = {
	render: () => ({
		components: { N8nText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 8px;">
				<N8nText>Regular text</N8nText>
				<N8nText bold>Bold text</N8nText>
			</div>
		`,
	}),
};
