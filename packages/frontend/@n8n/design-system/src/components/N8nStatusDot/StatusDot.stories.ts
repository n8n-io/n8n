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
			description: 'Draws a pulse ring. Only a solid dot pulses. An outline ring stays still.',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A small decorative status indicator dot. Pair it with text that carries the meaning. The dot itself is hidden from assistive technology. Each color can be a solid dot or an outline ring. The pulse applies to a solid dot only.',
			},
		},
	},
};
export default meta;

type Story = StoryObj<typeof meta>;

const variants = [
	{ id: 'success', label: 'Success' },
	{ id: 'warning', label: 'Warning' },
	{ id: 'danger', label: 'Danger' },
	{ id: 'neutral', label: 'Neutral' },
] as const;

const groupsTemplate = `
<div style="display: flex; flex-direction: column; gap: var(--spacing--lg);">
	<section style="display: flex; flex-direction: column; gap: var(--spacing--xs);">
		<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">Solid</h3>
		<div
			v-for="item in variants"
			:key="item.id"
			style="display: flex; align-items: center; gap: var(--spacing--2xs);"
		>
			<N8nStatusDot :variant="item.id" />
			<span style="font-size: var(--font-size--sm);">{{ item.label }}</span>
		</div>
	</section>
	<section style="display: flex; flex-direction: column; gap: var(--spacing--xs);">
		<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">Outline</h3>
		<div
			v-for="item in variants"
			:key="'outline-' + item.id"
			style="display: flex; align-items: center; gap: var(--spacing--2xs);"
		>
			<N8nStatusDot :variant="item.id" appearance="outline" />
			<span style="font-size: var(--font-size--sm);">{{ item.label }}</span>
		</div>
	</section>
</div>
`;

function renderGroups() {
	return () => ({
		components: { N8nStatusDot },
		setup: () => ({ variants }),
		template: groupsTemplate,
	});
}

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
	render: renderGroups(),
} satisfies Story;

export const Pulsing = {
	render: () => ({
		components: { N8nStatusDot },
		setup: () => ({ variants }),
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xs);">
			<div
				v-for="item in variants"
				:key="item.id"
				style="display: flex; align-items: center; gap: var(--spacing--2xs);"
			>
				<N8nStatusDot :variant="item.id" pulse />
				<span style="font-size: var(--font-size--sm);">{{ item.label }}</span>
			</div>
		</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'The pulse draws attention to a live or active state. Only a solid dot pulses. An outline ring stays still. The animation is disabled when the user prefers reduced motion.',
			},
		},
	},
} satisfies Story;
