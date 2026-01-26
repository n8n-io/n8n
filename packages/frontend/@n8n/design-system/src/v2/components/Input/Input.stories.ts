import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import Input from './Input.vue';

const meta = {
	title: 'Components v2/Input',
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
		<div style="padding: 40px; max-width: 400px;">
			<Input v-bind="args" v-model="value" />
			<p style="margin-top: 16px;">Value: {{ value }}</p>
		</div>
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
	},
} satisfies Story;

export const Textarea = {
	render: (args) => ({
		components: { Input },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 400px;">
			<h3>Fixed rows</h3>
			<Input v-bind="args" v-model="value" :rows="4" />
			<h3 style="margin-top: 16px;">Autosize</h3>
			<Input v-bind="args" v-model="value" :autosize="true" />
			<h3 style="margin-top: 16px;">Autosize with minRows/maxRows</h3>
			<Input v-bind="args" v-model="value" :autosize="{ minRows: 2, maxRows: 6 }" />
		</div>
		`,
	}),
	args: {
		type: 'textarea',
		placeholder: 'Enter multi-line text...',
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
		<div style="padding: 40px; max-width: 400px;">
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

export const WithSlots = {
	render: (args) => ({
		components: { Input, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; max-width: 400px;">
			<h3>Prefix slot</h3>
			<Input v-bind="args" v-model="value">
				<template #prefix>
					<N8nIcon icon="search" size="small" />
				</template>
			</Input>
			<h3 style="margin-top: 16px;">Suffix slot</h3>
			<Input v-bind="args" v-model="value">
				<template #suffix>
					<N8nIcon icon="check" size="small" />
				</template>
			</Input>
			<h3 style="margin-top: 16px;">Both slots</h3>
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
		placeholder: 'Enter text...',
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
		<div style="padding: 40px; max-width: 400px;">
			<Input v-bind="args" v-model="value" clearable />
			<p style="margin-top: 16px;">Value: {{ value }}</p>
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
		<div style="padding: 40px; max-width: 400px;">
			<h3>Disabled with value</h3>
			<Input v-bind="args" v-model="value" disabled />
			<h3 style="margin-top: 16px;">Disabled with placeholder</h3>
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
		<div style="padding: 40px; max-width: 400px;">
			<h3>xlarge (48px)</h3>
			<Input v-bind="args" v-model="value" size="xlarge" />
			<h3 style="margin-top: 16px;">large (40px) - default</h3>
			<Input v-bind="args" v-model="value" size="large" />
			<h3 style="margin-top: 16px;">medium (36px)</h3>
			<Input v-bind="args" v-model="value" size="medium" />
			<h3 style="margin-top: 16px;">small (28px)</h3>
			<Input v-bind="args" v-model="value" size="small" />
			<h3 style="margin-top: 16px;">mini (22px)</h3>
			<Input v-bind="args" v-model="value" size="mini" />
		</div>
		`,
	}),
	args: {
		placeholder: 'Enter text...',
		modelValue: '',
	},
} satisfies Story;
