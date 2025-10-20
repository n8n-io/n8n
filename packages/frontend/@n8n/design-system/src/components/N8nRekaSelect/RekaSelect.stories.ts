import type { StoryFn } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nRekaSelect from './RekaSelect.vue';
import type { RekaSelectOption } from './RekaSelect.vue';

export default {
	title: 'Atoms/RekaSelect',
	component: N8nRekaSelect,
	argTypes: {
		modelValue: {
			control: 'text',
		},
		placeholder: {
			control: 'text',
		},
		disabled: {
			control: 'boolean',
		},
		size: {
			control: 'select',
			options: ['small', 'medium', 'large'],
		},
	},
	parameters: {
		backgrounds: { default: 'white' },
	},
};

const basicOptions: RekaSelectOption[] = [
	{ label: 'Option 1', value: 'option1' },
	{ label: 'Option 2', value: 'option2' },
	{ label: 'Option 3', value: 'option3' },
	{ label: 'Option 4', value: 'option4' },
	{ label: 'Option 5', value: 'option5' },
];

const manyOptions: RekaSelectOption[] = Array.from({ length: 50 }, (_, i) => ({
	label: `Option ${i + 1}`,
	value: `option${i + 1}`,
}));

const optionsWithDisabled: RekaSelectOption[] = [
	{ label: 'Available Option 1', value: 'available1' },
	{ label: 'Disabled Option', value: 'disabled1', disabled: true },
	{ label: 'Available Option 2', value: 'available2' },
	{ label: 'Another Disabled', value: 'disabled2', disabled: true },
	{ label: 'Available Option 3', value: 'available3' },
];

const countriesOptions: RekaSelectOption[] = [
	{ label: 'United States', value: 'us' },
	{ label: 'United Kingdom', value: 'uk' },
	{ label: 'Germany', value: 'de' },
	{ label: 'France', value: 'fr' },
	{ label: 'Spain', value: 'es' },
	{ label: 'Italy', value: 'it' },
	{ label: 'Canada', value: 'ca' },
	{ label: 'Australia', value: 'au' },
	{ label: 'Japan', value: 'jp' },
	{ label: 'China', value: 'cn' },
	{ label: 'India', value: 'in' },
	{ label: 'Brazil', value: 'br' },
	{ label: 'Mexico', value: 'mx' },
	{ label: 'Netherlands', value: 'nl' },
	{ label: 'Switzerland', value: 'ch' },
];

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const selectedValue = ref(args.modelValue);
		return { args, selectedValue };
	},
	props: Object.keys(argTypes),
	components: {
		N8nRekaSelect,
	},
	template: `
		<div style="padding: 20px;">
			<N8nRekaSelect v-bind="args" v-model="selectedValue" />
			<p style="margin-top: 16px; color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Selected value: <strong>{{ selectedValue || 'none' }}</strong>
			</p>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {
	options: basicOptions,
	placeholder: 'Select an option',
	modelValue: undefined,
	disabled: false,
	size: 'medium',
};

export const WithSelection = Template.bind({});
WithSelection.args = {
	...Default.args,
	modelValue: 'option2',
};

export const Disabled = Template.bind({});
Disabled.args = {
	...Default.args,
	modelValue: 'option2',
	disabled: true,
};

export const SmallSize = Template.bind({});
SmallSize.args = {
	...Default.args,
	size: 'small',
};

export const LargeSize = Template.bind({});
LargeSize.args = {
	...Default.args,
	size: 'large',
};

export const WithManyOptions = Template.bind({});
WithManyOptions.args = {
	...Default.args,
	options: manyOptions,
	placeholder: 'Select from many options',
};

export const WithCountries = Template.bind({});
WithCountries.args = {
	...Default.args,
	options: countriesOptions,
	placeholder: 'Select a country',
};

export const WithDisabledOptions = Template.bind({});
WithDisabledOptions.args = {
	...Default.args,
	options: optionsWithDisabled,
	placeholder: 'Select an option',
};

export const LongOptions = Template.bind({});
LongOptions.args = {
	...Default.args,
	options: [
		{ label: 'Short', value: 'short' },
		{
			label: 'This is a very long option label that should be truncated properly',
			value: 'long1',
		},
		{
			label: 'Another extremely long option that demonstrates text overflow handling',
			value: 'long2',
		},
		{ label: 'Normal length option', value: 'normal' },
	],
	placeholder: 'Select an option',
};

const MultipleTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const value1 = ref<string>();
		const value2 = ref('medium');
		const value3 = ref<string>();
		return { args, value1, value2, value3 };
	},
	props: Object.keys(argTypes),
	components: {
		N8nRekaSelect,
	},
	template: `
		<div style="padding: 20px; display: flex; flex-direction: column; gap: 24px;">
			<div>
				<label style="display: block; margin-bottom: 8px; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold); color: var(--color--text);">
					Size
				</label>
				<N8nRekaSelect
					v-model="value1"
					:options="[
						{ label: 'Small', value: 'small' },
						{ label: 'Medium', value: 'medium' },
						{ label: 'Large', value: 'large' }
					]"
					placeholder="Select size"
					size="small"
				/>
			</div>

			<div>
				<label style="display: block; margin-bottom: 8px; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold); color: var(--color--text);">
					Priority
				</label>
				<N8nRekaSelect
					v-model="value2"
					:options="[
						{ label: 'Low', value: 'low' },
						{ label: 'Medium', value: 'medium' },
						{ label: 'High', value: 'high' },
						{ label: 'Critical', value: 'critical' }
					]"
					placeholder="Select priority"
				/>
			</div>

			<div>
				<label style="display: block; margin-bottom: 8px; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold); color: var(--color--text);">
					Country (Searchable)
				</label>
				<N8nRekaSelect
					v-model="value3"
					:options="${JSON.stringify(countriesOptions)}"
					placeholder="Select a country"
					size="large"
				/>
			</div>

			<div style="padding: 16px; background-color: var(--color--foreground--tint-2); border-radius: var(--radius); font-size: var(--font-size--sm);">
				<strong>Selected values:</strong>
				<ul style="margin: 8px 0 0; padding-left: 20px;">
					<li>Size: {{ value1 || 'none' }}</li>
					<li>Priority: {{ value2 || 'none' }}</li>
					<li>Country: {{ value3 || 'none' }}</li>
				</ul>
			</div>
		</div>
	`,
});

export const MultipleDropdowns = MultipleTemplate.bind({});

const KeyboardNavigationTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => {
		const selectedValue = ref<string>();
		return { args, selectedValue };
	},
	props: Object.keys(argTypes),
	components: {
		N8nRekaSelect,
	},
	template: `
		<div style="padding: 20px;">
			<div style="margin-bottom: 16px; padding: 16px; background-color: var(--color--foreground--tint-2); border-radius: var(--radius); font-size: var(--font-size--sm);">
				<strong>Keyboard Navigation:</strong>
				<ul style="margin: 8px 0 0; padding-left: 20px;">
					<li><kbd>Space</kbd> or <kbd>Enter</kbd> - Open/close dropdown</li>
					<li><kbd>↑</kbd> / <kbd>↓</kbd> - Navigate options</li>
					<li><kbd>Home</kbd> / <kbd>End</kbd> - Jump to first/last option</li>
					<li><kbd>Esc</kbd> - Close dropdown</li>
					<li><kbd>Type</kbd> - Quick search (typeahead)</li>
				</ul>
			</div>

			<N8nRekaSelect
				v-model="selectedValue"
				:options="${JSON.stringify(countriesOptions)}"
				placeholder="Try keyboard navigation"
			/>

			<p style="margin-top: 16px; color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
				Selected: <strong>{{ selectedValue || 'none' }}</strong>
			</p>
		</div>
	`,
});

export const KeyboardNavigation = KeyboardNavigationTemplate.bind({});
