import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import type { SegmentControlSize } from './SegmentControl.types';
import N8nSegmentControl from './SegmentControl.vue';

const sizeOptions: SegmentControlSize[] = ['mini', 'small', 'medium', 'large', 'xlarge'];

export default {
	title: 'Core/SegmentControl',
	component: N8nSegmentControl,
	argTypes: {
		size: {
			control: 'select',
			options: sizeOptions,
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A segmented single-choice control for switching between a small set of mutually exclusive options. Built on Reka UI RadioGroup with arrow-key navigation.',
			},
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

const methods = {
	onInput: action('update:modelValue'),
};

const defaultOptions = [
	{ label: 'Test', value: 'test' },
	{ label: 'World', value: 'world' },
	{ label: 'Hello', value: 'hello' },
];

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSegmentControl,
	},
	template: `<n8n-segment-control v-model="val" v-bind="args" @update:modelValue="onInput">
		</n8n-segment-control>`,
	methods,
	data() {
		return {
			val: 'test',
		};
	},
});

export const Example = Template.bind({});
Example.args = {
	options: defaultOptions,
};

export const Sizes: StoryFn = () => ({
	components: { N8nSegmentControl },
	setup() {
		const values = ref(
			Object.fromEntries(sizeOptions.map((size) => [size, 'test'])) as Record<
				SegmentControlSize,
				string
			>,
		);
		return { values, sizeOptions, options: defaultOptions };
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
			<div
				v-for="size in sizeOptions"
				:key="size"
				style="display: flex; align-items: center; gap: 12px;"
			>
				<span style="width: 100px; font-size: 12px; color: var(--text-color--subtle);">{{ size }}</span>
				<N8nSegmentControl v-model="values[size]" :options="options" :size="size" />
			</div>
		</div>
	`,
});

export const Disabled = Template.bind({});
Disabled.args = {
	modelValue: 'enabled',
	options: [
		{
			label: 'Enabled',
			value: 'enabled',
		},
		{
			label: 'Disabled',
			value: 'disabled',
			disabled: true,
		},
	],
};

export const Square = Template.bind({});
Square.args = {
	squareButtons: true,
	options: [
		{
			label: 'A',
			value: 'a',
		},
		{
			label: 'B',
			value: 'b',
		},
		{
			label: 'C',
			value: 'c',
		},
	],
};
