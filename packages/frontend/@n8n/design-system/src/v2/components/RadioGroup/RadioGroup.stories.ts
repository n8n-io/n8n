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

export const Controlled: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The selected value is owned by the parent via `v-model`. External controls can read and update the selection.',
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
		<div style="padding: 40px;">
			<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
				Parent-controlled selection. Use the buttons below to set the value externally.
			</p>
			<RadioGroup
				v-model="value"
				aria-label="Scope selection mode"
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
		</div>
		`,
	}),
};

export const Uncontrolled: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The initial selection is set with `defaultValue` and the component manages its own state. No `v-model` binding is required.',
			},
		},
	},
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			return { scopeOptions };
		},
		template: `
		<div style="padding: 40px;">
			<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
				Uncontrolled mode with <code>defaultValue="readOnly"</code>. The parent does not track changes.
			</p>
			<RadioGroup default-value="readOnly" aria-label="Scope selection mode">
				<RadioGroupItem
					v-for="option in scopeOptions"
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

export const Disabled: Story = {
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('all');
			return { value, scopeOptions };
		},
		template: `
		<div style="padding: 40px;">
			<RadioGroup v-model="value" disabled aria-label="Scope selection mode">
				<RadioGroupItem
					v-for="option in scopeOptions"
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

export const DisabledOption: Story = {
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('all');
			return { value };
		},
		template: `
		<div style="padding: 40px;">
			<RadioGroup v-model="value" aria-label="Scope selection mode">
				<RadioGroupItem value="all" label="All" />
				<RadioGroupItem value="readOnly" label="Read only" />
				<RadioGroupItem value="custom" label="Custom" disabled />
			</RadioGroup>
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

export const FormIntegration: Story = {
	render: () => ({
		components: { RadioGroup, RadioGroupItem },
		setup() {
			const value = ref('monthly');
			return { value };
		},
		template: `
		<form style="padding: 40px;" @submit.prevent>
			<fieldset style="border: none; padding: 0; margin: 0;">
				<legend style="margin-bottom: 8px; font-weight: 600;">Billing cycle</legend>
				<RadioGroup v-model="value" name="billing-cycle" required>
					<RadioGroupItem value="monthly" label="Monthly" description="$10 / month" />
					<RadioGroupItem value="yearly" label="Yearly" description="$100 / year (save 17%)" />
				</RadioGroup>
			</fieldset>
		</form>
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
