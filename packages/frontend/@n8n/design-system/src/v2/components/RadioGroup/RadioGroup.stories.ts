import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { defineComponent, ref } from 'vue';

import RadioGroup from './RadioGroup.vue';
import RadioGroupItem from './RadioGroupItem.vue';

const meta = {
	title: 'Experimental/RadioGroup',
	component: RadioGroup,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		orientation: {
			control: 'select',
			options: ['vertical', 'horizontal'],
			description: 'Layout direction of the radio options',
		},
		disabled: {
			control: 'boolean',
			description: 'Disables the entire radio group',
		},
		defaultValue: {
			control: 'text',
			description: 'Initial selected value when used without v-model (uncontrolled)',
		},
	},
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const radioItemId = (group: string, value: string) =>
	`${group}-${Math.random().toString(36).slice(2)}-${value}`;

const scopeOptions = [
	{ value: 'all', label: 'All', description: 'Grant every available scope' },
	{ value: 'readOnly', label: 'Read only', description: 'Read and list scopes only' },
	{ value: 'custom', label: 'Custom', description: 'Pick scopes individually' },
];

const longLabelOptions = [
	{
		value: 'passthrough',
		label: 'Automatically passthrough binary images without re-encoding',
		description:
			'When enabled, binary image data is forwarded unchanged to downstream nodes. This preserves the original file format and avoids unnecessary processing overhead.',
	},
	{
		value: 'security',
		label: 'Enable advanced security features for this workflow execution environment',
		description:
			'Applies additional sandboxing, credential isolation, and audit logging. Recommended for workflows that handle sensitive data or connect to production systems.',
	},
	{
		value: 'custom',
		label: 'Use a custom configuration with individually selected scopes and permissions',
		description:
			'Pick each scope manually. Useful when you need fine-grained control over what this credential can access, such as limiting to specific resources or read-only operations.',
	},
];

const RadioGroupDefaultDemo = defineComponent({
	name: 'RadioGroupDefaultDemo',
	components: { RadioGroup, RadioGroupItem },
	props: {
		orientation: { type: String, default: 'vertical' },
		disabled: { type: Boolean, default: false },
		defaultValue: { type: String, required: false },
	},
	setup() {
		const value = ref('all');
		return { value, scopeOptions, radioItemId, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="padding: 40px;">
			<RadioGroup
				v-model="value"
				:orientation="orientation"
				:disabled="disabled"
				:default-value="defaultValue"
				name="radio-group-default"
				aria-label="Scope selection mode"
				@update:model-value="onUpdate"
			>
				<RadioGroupItem
					v-for="option in scopeOptions"
					:key="option.value"
					:id="radioItemId('radio-group-default', option.value)"
					:value="option.value"
					:label="option.label"
					:description="option.description"
					:data-test-id="'radio-' + option.value"
				/>
			</RadioGroup>
			<p style="margin-top: 16px; font-size: 14px;">Selected: {{ value }}</p>
		</div>
	`,
});

const RadioGroupControlledUncontrolledDemo = defineComponent({
	name: 'RadioGroupControlledUncontrolledDemo',
	components: { RadioGroup, RadioGroupItem },
	setup() {
		const value = ref('all');
		return { value, scopeOptions, radioItemId, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 32px;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Controlled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Parent-controlled selection via <code>v-model</code>. Use the buttons below to set the value externally.
				</p>
				<RadioGroup
					key="controlled"
					v-model="value"
					name="radio-group-controlled"
					aria-label="Scope selection mode (controlled)"
					@update:model-value="onUpdate"
				>
					<RadioGroupItem
						v-for="option in scopeOptions"
						:key="'controlled-' + option.value"
						:id="radioItemId('radio-group-controlled', option.value)"
						:value="option.value"
						:label="option.label"
						:description="option.description"
					/>
				</RadioGroup>
				<div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
					<button
						v-for="option in scopeOptions"
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
					Initial selection set with <code>defaultValue="readOnly"</code>. The parent does not track changes.
				</p>
				<RadioGroup
					key="uncontrolled"
					default-value="readOnly"
					name="radio-group-uncontrolled"
					aria-label="Scope selection mode (uncontrolled)"
				>
					<RadioGroupItem
						v-for="option in scopeOptions"
						:key="'uncontrolled-' + option.value"
						:id="radioItemId('radio-group-uncontrolled', option.value)"
						:value="option.value"
						:label="option.label"
						:description="option.description"
					/>
				</RadioGroup>
			</section>
		</div>
	`,
});

const RadioGroupOrientationDemo = defineComponent({
	name: 'RadioGroupOrientationDemo',
	components: { RadioGroup, RadioGroupItem },
	setup() {
		const verticalValue = ref('all');
		const horizontalValue = ref('light');
		return { verticalValue, horizontalValue, scopeOptions, radioItemId };
	},
	template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 32px;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Vertical</h3>
				<RadioGroup
					key="vertical"
					v-model="verticalValue"
					name="radio-group-orientation-vertical"
					orientation="vertical"
					aria-label="Scope selection mode (vertical)"
				>
					<RadioGroupItem
						v-for="option in scopeOptions"
						:key="'vertical-' + option.value"
						:id="radioItemId('radio-group-orientation-vertical', option.value)"
						:value="option.value"
						:label="option.label"
						:description="option.description"
					/>
				</RadioGroup>
				<p style="margin-top: 16px; font-size: 14px;">Selected: {{ verticalValue }}</p>
			</section>
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Horizontal</h3>
				<RadioGroup
					key="horizontal"
					v-model="horizontalValue"
					name="radio-group-orientation-horizontal"
					orientation="horizontal"
					aria-label="Theme (horizontal)"
				>
					<RadioGroupItem id="radio-group-orientation-horizontal-system" value="system" label="System" />
					<RadioGroupItem id="radio-group-orientation-horizontal-light" value="light" label="Light" />
					<RadioGroupItem id="radio-group-orientation-horizontal-dark" value="dark" label="Dark" />
				</RadioGroup>
				<p style="margin-top: 16px; font-size: 14px;">Selected: {{ horizontalValue }}</p>
			</section>
		</div>
	`,
});

const RadioGroupDisabledOptionDemo = defineComponent({
	name: 'RadioGroupDisabledOptionDemo',
	components: { RadioGroup, RadioGroupItem },
	setup() {
		const value = ref('spain');
		return { value };
	},
	template: `
		<div style="padding: 40px;">
			<RadioGroup v-model="value" name="radio-group-disabled-option" aria-label="Country">
				<RadioGroupItem id="radio-group-disabled-option-france" value="france" label="France" />
				<RadioGroupItem id="radio-group-disabled-option-germany" value="germany" label="Germany" />
				<RadioGroupItem id="radio-group-disabled-option-italy" value="italy" label="Italy" disabled />
				<RadioGroupItem id="radio-group-disabled-option-spain" value="spain" label="Spain" disabled />
			</RadioGroup>
		</div>
	`,
});

const RadioGroupCustomLabelDemo = defineComponent({
	name: 'RadioGroupCustomLabelDemo',
	components: { RadioGroup, RadioGroupItem },
	setup() {
		const value = ref('terms');
		return { value };
	},
	template: `
		<div style="padding: 40px;">
			<RadioGroup v-model="value" name="radio-group-custom-label" aria-label="Agreement">
				<RadioGroupItem id="radio-group-custom-label-terms" value="terms">
					<template #label>
						I accept the <a href="#">terms and conditions</a>
					</template>
				</RadioGroupItem>
				<RadioGroupItem id="radio-group-custom-label-privacy" value="privacy">
					<template #label>
						I accept the <a href="#">privacy policy</a>
					</template>
				</RadioGroupItem>
			</RadioGroup>
		</div>
	`,
});

const RadioGroupLongLabelsDemo = defineComponent({
	name: 'RadioGroupLongLabelsDemo',
	components: { RadioGroup, RadioGroupItem },
	setup() {
		const value = ref('passthrough');
		return { value, longLabelOptions, radioItemId };
	},
	template: `
		<div style="padding: 40px; max-width: 360px;">
			<RadioGroup v-model="value" name="radio-group-long-labels" aria-label="Workflow configuration options">
				<RadioGroupItem
					v-for="option in longLabelOptions"
					:key="option.value"
					:id="radioItemId('radio-group-long-labels', option.value)"
					:value="option.value"
					:label="option.label"
					:description="option.description"
				/>
			</RadioGroup>
		</div>
	`,
});

export const Default: Story = {
	render: (args) => ({
		components: { RadioGroupDefaultDemo },
		setup() {
			return { args };
		},
		template: '<RadioGroupDefaultDemo v-bind="args" />',
	}),
	args: {
		orientation: 'vertical',
		disabled: false,
	},
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { RadioGroupControlledUncontrolledDemo },
		template: '<RadioGroupControlledUncontrolledDemo />',
	}),
};

export const Orientation: Story = {
	render: () => ({
		components: { RadioGroupOrientationDemo },
		template: '<RadioGroupOrientationDemo />',
	}),
};

export const DisabledOption: Story = {
	render: () => ({
		components: { RadioGroupDisabledOptionDemo },
		template: '<RadioGroupDisabledOptionDemo />',
	}),
};

export const CustomLabel: Story = {
	render: () => ({
		components: { RadioGroupCustomLabelDemo },
		template: '<RadioGroupCustomLabelDemo />',
	}),
};

export const LongLabels: Story = {
	render: () => ({
		components: { RadioGroupLongLabelsDemo },
		template: '<RadioGroupLongLabelsDemo />',
	}),
};
