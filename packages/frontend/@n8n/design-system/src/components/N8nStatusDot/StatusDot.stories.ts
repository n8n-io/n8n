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

const rowStyle =
	'display: flex; align-items: center; gap: var(--spacing--2xs); font-size: var(--font-size--sm);';

const headingStyle =
	'margin: 0 0 var(--spacing--xs); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);';

export const Variants = {
	render: () => ({
		components: { N8nStatusDot },
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--lg);">
			<section>
				<h3 style="${headingStyle}">Solid</h3>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<div style="${rowStyle}"><N8nStatusDot variant="success" appearance="fill" /> Success</div>
					<div style="${rowStyle}"><N8nStatusDot variant="warning" appearance="fill" /> Warning</div>
					<div style="${rowStyle}"><N8nStatusDot variant="danger" appearance="fill" /> Danger</div>
					<div style="${rowStyle}"><N8nStatusDot variant="neutral" appearance="fill" /> Neutral</div>
				</div>
			</section>
			<section>
				<h3 style="${headingStyle}">Outline</h3>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<div style="${rowStyle}"><N8nStatusDot variant="success" appearance="outline" /> Success</div>
					<div style="${rowStyle}"><N8nStatusDot variant="warning" appearance="outline" /> Warning</div>
					<div style="${rowStyle}"><N8nStatusDot variant="danger" appearance="outline" /> Danger</div>
					<div style="${rowStyle}"><N8nStatusDot variant="neutral" appearance="outline" /> Neutral</div>
				</div>
			</section>
		</div>
		`,
	}),
} satisfies Story;

export const Pulsing = {
	render: () => ({
		components: { N8nStatusDot },
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--lg);">
			<section>
				<h3 style="${headingStyle}">Solid</h3>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<div style="${rowStyle}"><N8nStatusDot variant="success" appearance="fill" pulse /> Success</div>
					<div style="${rowStyle}"><N8nStatusDot variant="warning" appearance="fill" pulse /> Warning</div>
					<div style="${rowStyle}"><N8nStatusDot variant="danger" appearance="fill" pulse /> Danger</div>
					<div style="${rowStyle}"><N8nStatusDot variant="neutral" appearance="fill" pulse /> Neutral</div>
				</div>
			</section>
			<section>
				<h3 style="${headingStyle}">Outline</h3>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
					<div style="${rowStyle}"><N8nStatusDot variant="success" appearance="outline" pulse /> Success</div>
					<div style="${rowStyle}"><N8nStatusDot variant="warning" appearance="outline" pulse /> Warning</div>
					<div style="${rowStyle}"><N8nStatusDot variant="danger" appearance="outline" pulse /> Danger</div>
					<div style="${rowStyle}"><N8nStatusDot variant="neutral" appearance="outline" pulse /> Neutral</div>
				</div>
			</section>
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
