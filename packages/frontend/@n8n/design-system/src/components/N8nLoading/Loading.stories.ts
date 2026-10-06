import type { StoryFn } from '@storybook/vue3-vite';
import { useTimeoutFn } from '@vueuse/core';
import { ref } from 'vue';

import N8nLoading from './Loading.vue';
import N8nCircleLoader from '../N8nCircleLoader/CircleLoader.vue';
import N8nSpinner from '../N8nSpinner/Spinner.vue';
import N8nButton from '../N8nButton/Button.vue';

export default {
	title: 'Core/Loading',
	component: N8nLoading,
	argTypes: {
		delay: {
			control: { type: 'number', min: 0 },
			description: 'Wait before showing the skeleton, in milliseconds. Zero shows it immediately.',
		},
		animated: {
			control: {
				type: 'boolean',
			},
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
		rows: {
			control: {
				type: 'select',
			},
			options: [1, 2, 3, 4, 5],
		},
		variant: {
			control: {
				type: 'select',
			},
			options: ['button', 'h1', 'image', 'p'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A set of loading indicators including skeleton, spinner, and progress states.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nLoading,
	},
	template: '<n8n-loading v-bind="args"></n8n-loading>',
});

export const Default = Template.bind({});
Default.args = {
	variant: 'p',
};

export const Immediate = Template.bind({});
Immediate.args = { delay: 0 };

function requestStory(duration: number): StoryFn {
	return () => ({
		components: { N8nLoading, N8nButton },
		setup() {
			const loading = ref(false);
			const { start } = useTimeoutFn(
				() => {
					loading.value = false;
				},
				duration,
				{ immediate: false },
			);
			function load() {
				loading.value = true;
				start();
			}
			return { loading, load };
		},
		template: `
			<div>
				<N8nButton :disabled="loading" @click="load">Load content</N8nButton>
				<N8nLoading v-if="loading" :rows="3" />
				<p v-else>Content is ready.</p>
			</div>
		`,
	});
}

export const FastRequest = requestStory(100);
export const SlowRequest = requestStory(1500);

export const Variants: StoryFn = () => ({
	components: { N8nLoading },
	template: `
		<div style="display: flex; flex-direction: column; gap: 16px;">
			<n8n-loading variant="p" :rows="2" />
			<n8n-loading variant="text" />
			<n8n-loading variant="h1" />
			<n8n-loading variant="h3" />
			<n8n-loading variant="caption" />
			<n8n-loading variant="button" />
			<n8n-loading variant="image" />
			<n8n-loading variant="circle" />
			<n8n-loading variant="rect" />
		</div>
	`,
});

export const SpinnerVariants: StoryFn = () => ({
	components: {
		N8nSpinner,
	},
	template: `
		<div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
			<n8n-spinner type="dots" size="small" />
			<n8n-spinner type="dots" size="medium" />
			<n8n-spinner type="dots" size="large" />
			<n8n-spinner type="ring" size="small" />
			<n8n-spinner type="ring" size="medium" />
			<n8n-spinner type="ring" size="large" />
		</div>
	`,
});

interface CircleLoaderArgs {
	radius: number;
	progress: number;
	strokeWidth: number;
}

const CircleLoaderTemplate: StoryFn<CircleLoaderArgs> = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nCircleLoader,
	},
	template: '<n8n-circle-loader v-bind="args" />',
});

export const ProgressCircle = CircleLoaderTemplate.bind({});
ProgressCircle.args = {
	radius: 20,
	progress: 42,
	strokeWidth: 10,
};
