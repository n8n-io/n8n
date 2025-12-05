import type { StoryFn } from '@storybook/vue3-vite';

import N8nCircleLoader from './CircleLoader.vue';

export default {
	title: 'Atoms/CircleLoader',
	component: N8nCircleLoader,
	argTypes: {
		radius: {
			control: {
				type: 'number',
			},
		},
		progress: {
			control: {
				type: 'number',
			},
		},
		strokeWidth: {
			control: {
				type: 'number',
			},
		},
	},
};

interface Args {
	radius: number;
	progress: number;
	strokeWidth: number;
}

const template: StoryFn<Args> = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nCircleLoader,
	},
	template: `
		<div>
			<n8n-circle-loader v-bind="args" />
		</div>
	`,
});

export const defaultCircleLoader = template.bind({});
defaultCircleLoader.args = {
	radius: 20,
	progress: 42,
	strokeWidth: 10,
};
