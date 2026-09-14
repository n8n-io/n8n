import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { InputProps } from './Input.types';
import Input from './Input.vue';

const meta = {
	title: 'Core/Input',
	component: Input,
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'textarea', 'password', 'number', 'email'],
		},
		size: {
			control: 'select',
			options: ['xlarge', 'large', 'medium', 'small', 'mini'],
		},
		disabled: {
			control: 'boolean',
		},
		readonly: {
			control: 'boolean',
		},
		clearable: {
			control: 'boolean',
		},
		autosize: {
			control: 'boolean',
		},
		autofocus: {
			control: 'boolean',
		},
		rows: {
			control: 'number',
		},
		maxlength: {
			control: 'number',
		},
		placeholder: {
			control: 'text',
		},
		modelValue: {
			control: 'text',
		},
		autocomplete: {
			control: 'select',
			options: [
				'off',
				'on',
				'new-password',
				'current-password',
				'given-name',
				'family-name',
				'one-time-code',
				'email',
			],
		},
		name: {
			control: 'text',
		},
	},
	parameters: {
		docs: {
			description: { component: 'A text input field for single-line or multi-line value entry.' },
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof Input>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value" />
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
		size: 'medium',
		disabled: false,
		readonly: false,
		clearable: false,
	},
} satisfies Story;

export const TextareaFixedRows = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value" />
		`,
	}),
	args: {
		type: 'textarea',
		rows: 4,
		placeholder: 'Enter multi-line text...',
		modelValue: '',
	},
} satisfies Story;

export const TextareaAutosize = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value" />
		`,
	}),
	args: {
		type: 'textarea',
		autosize: true,
		placeholder: 'Auto-growing textarea...',
		modelValue: '',
	},
} satisfies Story;

export const TextareaAutosizeMinMax = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value" />
		`,
	}),
	args: {
		type: 'textarea',
		autosize: { minRows: 2, maxRows: 6 },
		placeholder: 'Auto-growing with min 2, max 6 rows...',
		modelValue: '',
	},
} satisfies Story;

export const Password = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value" />
		`,
	}),
	args: {
		type: 'password',
		placeholder: 'Enter password...',
		modelValue: '',
	},
} satisfies Story;

export const WithPrefixSlot = {
	render: (args: InputProps) => ({
		components: { Input, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value">
				<template #prefix>
					<N8nIcon icon="search" size="small" />
				</template>
			</Input>
		`,
	}),
	args: {
		placeholder: 'Search...',
		modelValue: '',
	},
} satisfies Story;

export const WithSuffixSlot = {
	render: (args: InputProps) => ({
		components: { Input, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value">
				<template #suffix>
					<N8nIcon icon="check" size="small" />
				</template>
			</Input>
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
	},
} satisfies Story;

export const WithPrefixAndSuffixSlots = {
	render: (args: InputProps) => ({
		components: { Input, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value">
				<template #prefix>
					<N8nIcon icon="envelope" size="small" />
				</template>
				<template #suffix>
					<N8nIcon icon="check" size="small" />
				</template>
			</Input>
		`,
	}),
	args: {
		placeholder: 'Email address...',
		modelValue: '',
	},
} satisfies Story;

export const Clearable = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
			<Input v-bind="args" v-model="value" clearable />
		`,
	}),
	args: {
		placeholder: 'Type something and clear...',
		modelValue: 'Clear me!',
	},
} satisfies Story;

export const Disabled = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px;">
			<div>
				<h3>Disabled with value</h3>
				<Input v-bind="args" v-model="value" disabled />
			</div>
			<div>
				<h3>Disabled with placeholder</h3>
				<Input placeholder="Disabled input" disabled />
			</div>
		</div>
		`,
	}),
	args: {
		modelValue: 'Disabled value',
	},
} satisfies Story;

export const Sizes = {
	render: (args: InputProps) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="display: flex; gap: var(--spacing--md); align-items: flex-start;">
			<div style="display: grid; gap: var(--spacing--3xs);">
				<Input v-bind="args" v-model="value" size="xlarge" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					xlarge (40px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<Input v-bind="args" v-model="value" size="large" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					large (36px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<Input v-bind="args" v-model="value" size="medium" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					medium (32px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<Input v-bind="args" v-model="value" size="small" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					small (28px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<Input v-bind="args" v-model="value" size="mini" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					mini (24px)
				</span>
			</div>
		</div>
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
	},
} satisfies Story;

export const InlineWithButton = {
	render: (args: InputProps) => ({
		components: { Input, N8nButton },
		setup() {
			const primaryValue = ref(args.modelValue);
			const secondaryValue = ref('');
			return { args, primaryValue, secondaryValue };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
			<div style="display: flex; gap: var(--spacing--2xs); align-items: center; width: 100%;">
				<Input v-bind="args" v-model="primaryValue" placeholder="Search workflows" />
				<N8nButton variant="solid" size="large">Search</N8nButton>
			</div>
			<div style="display: flex; gap: var(--spacing--2xs); align-items: center; width: 100%;">
				<Input v-bind="args" v-model="secondaryValue" size="medium" placeholder="Invite by email" />
				<N8nButton variant="subtle" size="medium">Invite</N8nButton>
			</div>
		</div>
		`,
	}),
	args: {
		placeholder: 'Search workflows',
		modelValue: '',
		size: 'large',
	},
} satisfies Story;
