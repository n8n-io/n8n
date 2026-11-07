import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nVisuallyHidden from './VisuallyHidden.vue';

const meta: Meta<typeof N8nVisuallyHidden> = {
	title: 'Core/VisuallyHidden',
	component: N8nVisuallyHidden,
	parameters: {
		docs: {
			description: {
				component: 'Hides content visually and keeps it available to screen readers.',
			},
		},
	},
};

export default meta;

type Story = StoryObj<typeof N8nVisuallyHidden>;

export const HiddenHeading: Story = {
	args: { asChild: true },
	render: function renderHiddenHeading(args) {
		return {
			components: { N8nVisuallyHidden },
			setup: function setup() {
				return { args };
			},
			template: `
				<section aria-labelledby="hidden-heading">
					<N8nVisuallyHidden v-bind="args">
						<h3 id="hidden-heading">Settings</h3>
					</N8nVisuallyHidden>
					<p>The section heading is available to screen readers.</p>
				</section>
			`,
		};
	},
};
