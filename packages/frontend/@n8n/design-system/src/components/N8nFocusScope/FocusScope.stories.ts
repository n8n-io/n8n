import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nFocusScope from './FocusScope.vue';

const meta: Meta<typeof N8nFocusScope> = {
	title: 'Core/FocusScope',
	component: N8nFocusScope,
	parameters: {
		docs: {
			description: {
				component:
					'Contains keyboard focus inside a region. Use it for custom overlays that are not an `N8nDialog`.',
			},
		},
	},
	argTypes: {
		loop: { control: 'boolean' },
		trapped: { control: 'boolean' },
		asChild: { control: 'boolean' },
	},
};

export default meta;

type Story = StoryObj<typeof N8nFocusScope>;

export const Default: Story = {
	args: {
		loop: true,
		trapped: true,
	},
	render: function renderDefault(args) {
		return {
			components: { N8nFocusScope },
			setup: function setup() {
				return { args };
			},
			template: `
				<N8nFocusScope v-bind="args">
					<div style="display: flex; gap: var(--spacing--xs); padding: var(--spacing--sm); border: var(--border-width) solid var(--border-color); border-radius: var(--radius--md);">
						<button type="button">First</button>
						<button type="button">Second</button>
						<button type="button">Third</button>
					</div>
				</N8nFocusScope>
			`,
		};
	},
};
