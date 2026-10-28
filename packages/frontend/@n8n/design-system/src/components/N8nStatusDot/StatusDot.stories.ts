import type { StoryObj } from '@storybook/vue3-vite';

import N8nStatusDot from './StatusDot.vue';

const meta = {
	title: 'Core/StatusDot',
	component: N8nStatusDot,
	argTypes: {
		variant: {
			control: 'select',
			options: ['success', 'warning', 'danger', 'neutral'],
		},
		appearance: {
			control: 'select',
			options: ['fill', 'outline'],
		},
		pulse: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A small decorative status indicator dot. Pair it with text that carries the meaning. The dot itself is hidden from assistive technology. Each color can be filled or an outline ring.',
			},
		},
	},
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args) => ({
		components: { N8nStatusDot },
		setup: () => ({ args }),
		template: '<N8nStatusDot v-bind="args" />',
	}),
	args: {
		variant: 'success',
		appearance: 'fill',
		pulse: false,
	},
} satisfies Story;

export const Variants = {
	render: () => ({
		components: { N8nStatusDot },
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--sm)">
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="success" /> Success
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="warning" /> Warning
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="danger" /> Danger
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="neutral" /> Neutral
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="success" appearance="outline" /> Success outline
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="warning" appearance="outline" /> Warning outline
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="danger" appearance="outline" /> Danger outline
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<N8nStatusDot variant="neutral" appearance="outline" /> Neutral outline
			</div>
		</div>
		`,
	}),
} satisfies Story;

export const Pulsing = {
	render: () => ({
		components: { N8nStatusDot },
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px">
			<div style="display: flex; align-items: center; gap: 8px;">
				<N8nStatusDot variant="success" pulse /> Enabled
			</div>
			<div style="display: flex; align-items: center; gap: 8px;">
				<N8nStatusDot variant="danger" /> Disabled
			</div>
		</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'The pulse draws attention to a live or active state. The animation is disabled when the user prefers reduced motion.',
			},
		},
	},
} satisfies Story;
