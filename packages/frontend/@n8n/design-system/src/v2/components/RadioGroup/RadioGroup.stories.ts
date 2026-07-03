import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import RadioGroupItem from './RadioGroupItem.vue';
import RadioGroup from './RadioGroup.vue';

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

const scopeOptions = [
	{ value: 'all', label: 'All', description: 'Grant every available scope' },
	{ value: 'readOnly', label: 'Read only', description: 'Read and list scopes only' },
	{ value: 'custom', label: 'Custom', description: 'Pick scopes individually' },
];

export const Default: Story = {
	render: (args) => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('all');
			return { args, value, scopeOptions, onUpdate: action('update:modelValue') };
		},
		template: `
		<div style="padding: 40px;">
			<RadioGroup
				v-model="value"
				v-bind="args"
				aria-label="Scope selection mode"
				@update:model-value="onUpdate"
			>
				<RadioGroupItem
					v-for="option in scopeOptions"
					:key="option.value"
					:value="option.value"
					:label="option.label"
					:description="option.description"
					:test-id="'radio-' + option.value"
				/>
			</RadioGroup>
			<p style="margin-top: 16px; font-size: 14px;">Selected: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		orientation: 'vertical',
		disabled: false,
	},
};

export const ControlledAndUncontrolled: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Use `v-model` when the parent owns the selected value, or `defaultValue` when the component manages its own state.',
			},
		},
	},
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('all');
			return { value, scopeOptions, onUpdate: action('update:modelValue') };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 32px;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Controlled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Parent-controlled selection via <code>v-model</code>. Use the buttons below to set the value externally.
				</p>
				<RadioGroup
					v-model="value"
					aria-label="Scope selection mode (controlled)"
					@update:model-value="onUpdate"
				>
					<RadioGroupItem
						v-for="option in scopeOptions"
						:key="option.value"
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
				<RadioGroup default-value="readOnly" aria-label="Scope selection mode (uncontrolled)">
					<RadioGroupItem
						v-for="option in scopeOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
						:description="option.description"
					/>
				</RadioGroup>
			</section>
		</div>
		`,
	}),
};

export const Horizontal: Story = {
	render: (args) => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('light');
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<RadioGroup v-model="value" orientation="horizontal" aria-label="Theme">
				<RadioGroupItem value="system" label="System" />
				<RadioGroupItem value="light" label="Light" />
				<RadioGroupItem value="dark" label="Dark" />
			</RadioGroup>
		</div>
		`,
	}),
};

export const DisabledOption: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Individual options can be disabled. Disabled options render differently when selected vs unselected.',
			},
		},
	},
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const unselectedValue = ref('all');
			const selectedValue = ref('custom');
			return { unselectedValue, selectedValue };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 32px;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Disabled (unselected)</h3>
				<RadioGroup v-model="unselectedValue" aria-label="Scope selection mode (disabled unselected)">
					<RadioGroupItem value="all" label="All" />
					<RadioGroupItem value="readOnly" label="Read only" />
					<RadioGroupItem value="custom" label="Custom" disabled />
				</RadioGroup>
			</section>
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Disabled (selected)</h3>
				<RadioGroup v-model="selectedValue" aria-label="Scope selection mode (disabled selected)">
					<RadioGroupItem value="all" label="All" />
					<RadioGroupItem value="readOnly" label="Read only" />
					<RadioGroupItem value="custom" label="Custom" disabled />
				</RadioGroup>
			</section>
		</div>
		`,
	}),
};

export const CustomSlot: Story = {
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('terms');
			return { value };
		},
		template: `
		<div style="padding: 40px;">
			<RadioGroup v-model="value" aria-label="Agreement">
				<RadioGroupItem value="terms">
					I accept the <a href="#">terms and conditions</a>
				</RadioGroupItem>
				<RadioGroupItem value="privacy">
					I accept the <a href="#">privacy policy</a>
				</RadioGroupItem>
			</RadioGroup>
		</div>
		`,
	}),
};

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

export const LongLabels: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Long labels and descriptions wrap to multiple lines. The radio control stays aligned to the top when descriptions are present.',
			},
		},
	},
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('passthrough');
			return { value, longLabelOptions };
		},
		template: `
		<div style="padding: 40px; max-width: 360px;">
			<RadioGroup v-model="value" aria-label="Workflow configuration options">
				<RadioGroupItem
					v-for="option in longLabelOptions"
					:key="option.value"
					:value="option.value"
					:label="option.label"
					:description="option.description"
				/>
			</RadioGroup>
		</div>
		`,
	}),
};
