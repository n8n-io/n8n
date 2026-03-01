import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import Input from './Input.vue';
import './Input.stories.css';

const meta = {
	title: 'Atoms/Input',
	component: Input,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof Input>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Text = {
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value" />
			<p class="input-story-value">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
	},
} satisfies Story;

export const TextareaFixedRows = {
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value" />
		</div>
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
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value" />
		</div>
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
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value" />
		</div>
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
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value" />
		</div>
		`,
	}),
	args: {
		type: 'password',
		placeholder: 'Enter password...',
		modelValue: '',
	},
} satisfies Story;

export const WithPrefixSlot = {
	render: (args) => ({
		components: { Input, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value">
				<template #prefix>
					<N8nIcon icon="search" size="small" />
				</template>
			</Input>
		</div>
		`,
	}),
	args: {
		placeholder: 'Search...',
		modelValue: '',
	},
} satisfies Story;

export const WithSuffixSlot = {
	render: (args) => ({
		components: { Input, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value">
				<template #suffix>
					<N8nIcon icon="check" size="small" />
				</template>
			</Input>
		</div>
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
	},
} satisfies Story;

export const WithPrefixAndSuffixSlots = {
	render: (args) => ({
		components: { Input, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value">
				<template #prefix>
					<N8nIcon icon="envelope" size="small" />
				</template>
				<template #suffix>
					<N8nIcon icon="check" size="small" />
				</template>
			</Input>
		</div>
		`,
	}),
	args: {
		placeholder: 'Email address...',
		modelValue: '',
	},
} satisfies Story;

export const Clearable = {
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<Input v-bind="args" v-model="value" clearable />
			<p class="input-story-value">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		placeholder: 'Type something and clear...',
		modelValue: 'Clear me!',
	},
} satisfies Story;

export const Disabled = {
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<h3>Disabled with value</h3>
			<Input v-bind="args" v-model="value" disabled />
			<h3 class="input-story-section">Disabled with placeholder</h3>
			<Input placeholder="Disabled input" disabled />
		</div>
		`,
	}),
	args: {
		modelValue: 'Disabled value',
	},
} satisfies Story;

export const Sizes = {
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div class="input-story-container">
			<h3>xlarge (48px)</h3>
			<Input v-bind="args" v-model="value" size="xlarge" />
			<h3 class="input-story-section">large (40px) - default</h3>
			<Input v-bind="args" v-model="value" size="large" />
			<h3 class="input-story-section">medium (36px)</h3>
			<Input v-bind="args" v-model="value" size="medium" />
			<h3 class="input-story-section">small (28px)</h3>
			<Input v-bind="args" v-model="value" size="small" />
			<h3 class="input-story-section">mini (22px)</h3>
			<Input v-bind="args" v-model="value" size="mini" />
		</div>
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
	},
} satisfies Story;
