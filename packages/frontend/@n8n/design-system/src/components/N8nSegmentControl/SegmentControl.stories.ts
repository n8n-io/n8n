import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { defineComponent, ref, watch } from 'vue';

import N8nIcon from '../N8nIcon';
import type { SegmentControlSize, SegmentOption } from './SegmentControl.types';
import N8nSegmentControl from './SegmentControl.vue';
import type { IconName } from '../N8nIcon/icons';

const sizeOptions: SegmentControlSize[] = ['mini', 'small', 'default', 'large', 'xlarge'];
const playgroundItemCounts = [2, 3, 4, 5, 6] as const;

export default {
	title: 'Core/SegmentControl',
	component: N8nSegmentControl,
	argTypes: {
		size: {
			control: 'select',
			options: sizeOptions,
		},
		disabled: { control: 'boolean' },
		squareButtons: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A segmented single-choice control for switching between a small set of mutually exclusive options. Built on Reka UI RadioGroup with arrow-key navigation. Supports controlled (`v-model`) and uncontrolled (`defaultValue`) usage.',
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

export const Default = Template.bind({});
Default.args = {
	options: defaultOptions,
};

type PlaygroundItemCount = (typeof playgroundItemCounts)[number];

type PlaygroundArgs = {
	itemCount: PlaygroundItemCount;
	size: SegmentControlSize;
	disabled: boolean;
	squareButtons: boolean;
	options?: Array<SegmentOption<string>>;
	modelValue?: string;
	defaultValue?: string;
};

const playgroundOptionsByCount: Record<PlaygroundItemCount, Array<SegmentOption<string>>> = {
	2: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
	],
	3: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
		{ label: 'Item 3', value: '3' },
	],
	4: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
		{ label: 'Item 3', value: '3' },
		{ label: 'Item 4', value: '4' },
	],
	5: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
		{ label: 'Item 3', value: '3' },
		{ label: 'Item 4', value: '4' },
		{ label: 'Item 5', value: '5' },
	],
	6: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
		{ label: 'Item 3', value: '3' },
		{ label: 'Item 4', value: '4' },
		{ label: 'Item 5', value: '5' },
		{ label: 'Item 6', value: '6' },
	],
};

/** itemCount is a Figma-style variant: each value swaps in a hard-coded options list. */
export const Playground: StoryFn<PlaygroundArgs> = (args) => ({
	components: { N8nSegmentControl },
	setup() {
		const value = ref('1');

		watch(
			() => args.itemCount,
			(itemCount) => {
				const next = playgroundOptionsByCount[itemCount];
				if (!next.some((option) => option.value === value.value)) {
					value.value = next[0]?.value ?? '1';
				}
			},
		);

		return { args, value, playgroundOptionsByCount, onInput: action('update:modelValue') };
	},
	template: `
		<N8nSegmentControl
			v-model="value"
			:options="playgroundOptionsByCount[args.itemCount]"
			:size="args.size"
			:disabled="args.disabled"
			:square-buttons="args.squareButtons"
			@update:model-value="onInput"
		/>
	`,
});
Playground.args = {
	itemCount: 3,
	size: 'default',
	disabled: false,
	squareButtons: false,
};
Playground.argTypes = {
	itemCount: {
		control: 'radio',
		options: [...playgroundItemCounts],
		description:
			'Variant for how many segments to show. Map to the Figma "number of items" property.',
	},
	options: { table: { disable: true } },
	modelValue: { table: { disable: true } },
	defaultValue: { table: { disable: true } },
};

export const Sizes: StoryFn = () => ({
	components: { N8nSegmentControl },
	setup() {
		const values = ref<Record<SegmentControlSize, string>>({
			mini: 'test',
			small: 'test',
			default: 'test',
			large: 'test',
			xlarge: 'test',
		});
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
	disabled: true,
	options: defaultOptions,
};

export const DisabledOption: StoryFn = (args, { argTypes }) => ({
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
			val: 'daily',
		};
	},
});
DisabledOption.args = {
	options: [
		{ label: 'Daily', value: 'daily' },
		{ label: 'Weekly', value: 'weekly' },
		{ label: 'Monthly', value: 'monthly', disabled: true },
		{ label: 'Yearly', value: 'yearly' },
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

const iconOptions: Array<SegmentOption<string> & { icon: IconName }> = [
	{ label: 'Table', value: 'table', icon: 'table' },
	{ label: 'JSON', value: 'json', icon: 'json' },
	{ label: 'Schema', value: 'schema', icon: 'schema' },
	{ label: 'Binary', value: 'binary', icon: 'binary' },
];

export const Icons: StoryFn = () => ({
	components: { N8nSegmentControl, N8nIcon },
	setup() {
		const withLabels = ref('table');
		const iconOnly = ref('table');
		return { withLabels, iconOnly, iconOptions, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 32px; align-items: flex-start;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Icon + label</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Use the <code>#option</code> slot to render an icon alongside the label.
				</p>
				<N8nSegmentControl
					v-model="withLabels"
					:options="iconOptions"
					@update:model-value="onUpdate"
				>
					<template #option="option">
						<span style="display: inline-flex; align-items: center; gap: var(--spacing--4xs);">
							<N8nIcon :icon="option.icon" size="small" />
							{{ option.label }}
						</span>
					</template>
				</N8nSegmentControl>
			</section>
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Icon only</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Combine <code>squareButtons</code> with the <code>#option</code> slot. Keep
					<code>label</code> for accessibility (<code>aria-label</code>).
				</p>
				<N8nSegmentControl
					v-model="iconOnly"
					:options="iconOptions"
					square-buttons
					@update:model-value="onUpdate"
				>
					<template #option="option">
						<N8nIcon :icon="option.icon" size="small" />
					</template>
				</N8nSegmentControl>
			</section>
		</div>
	`,
});

const ControlledUncontrolledDemo = defineComponent({
	name: 'SegmentControlControlledUncontrolledDemo',
	components: { N8nSegmentControl },
	setup() {
		const value = ref('test');
		return { value, options: defaultOptions, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 32px; align-items: flex-start;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Controlled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Parent-controlled selection via <code>v-model</code>. Use the buttons below to set the value externally.
				</p>
				<N8nSegmentControl
					v-model="value"
					:options="options"
					@update:model-value="onUpdate"
				/>
				<div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
					<button
						v-for="option in options"
						:key="option.value"
						type="button"
						style="padding: 4px 12px; font-size: 13px; cursor: pointer;"
						@click="value = option.value"
					>
						Set to "{{ option.label }}"
					</button>
				</div>
				<p style="margin-top: 16px; font-size: 14px;">Selected: <strong>{{ value }}</strong></p>
			</section>
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Uncontrolled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Initial selection set with <code>defaultValue="world"</code>. The parent does not track changes.
				</p>
				<N8nSegmentControl
					default-value="world"
					:options="options"
				/>
			</section>
		</div>
	`,
});

export const ControlledUncontrolled: StoryFn = () => ({
	components: { ControlledUncontrolledDemo },
	template: '<ControlledUncontrolledDemo />',
});
ControlledUncontrolled.storyName = 'Controlled/Uncontrolled';
