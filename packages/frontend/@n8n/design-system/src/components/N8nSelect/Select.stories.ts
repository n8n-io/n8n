import type { StoryContext, StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import N8nSelect from './Select.vue';
import N8nIcon from '../N8nIcon';
import N8nOption from '../N8nOption';

export default {
	title: 'Core/Select',
	component: N8nSelect,
	tags: ['visual'],
	argTypes: {
		disabled: {
			control: {
				type: 'boolean',
			},
		},
		size: {
			control: {
				type: 'select',
			},
			options: ['large', 'medium', 'small', 'mini'],
		},
		loading: {
			control: {
				type: 'boolean',
			},
		},
		filterable: {
			control: {
				type: 'boolean',
			},
		},
		defaultFirstOption: {
			control: {
				type: 'boolean',
			},
		},
	},
	parameters: {
		docs: {
			description: { component: 'A select input for choosing from predefined options.' },
		},
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onChange: action('change'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSelect,
		N8nOption,
		N8nIcon,
	},
	template:
		'<n8n-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange"><n8n-option value="1">op1</n8n-option><n8n-option value="2">op2</n8n-option></n8n-select>',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const Default = Template.bind({});
Default.parameters = {
	visual: {
		states: [{ name: 'focus', action: 'focus', selector: 'input' }],
	},
};

export const Disabled = Template.bind({});
Disabled.args = {
	disabled: true,
};

const MultipleTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSelect,
		N8nOption,
	},
	template:
		'<n8n-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange"><n8n-option value="1">op1</n8n-option><n8n-option value="2">op2</n8n-option><n8n-option value="3">op3</n8n-option></n8n-select>',
	data() {
		return {
			val: ['1', '2', '3'],
		};
	},
	methods,
});

export const Multiple = MultipleTemplate.bind({});
Multiple.args = {
	multiple: true,
};

/*
 * Open states for the visual tests. The dropdown teleports to `body`, so the
 * screenshot is of the full viewport.
 */
const openSelect =
	(visibleText: string) =>
	async ({ canvasElement }: StoryContext) => {
		await userEvent.click(within(canvasElement).getByRole('combobox'));
		await waitFor(
			async () => await expect(within(document.body).getByText(visibleText)).toBeVisible(),
		);
	};

export const DefaultOpen = Template.bind({});
DefaultOpen.parameters = { visual: { target: 'viewport' } };
DefaultOpen.play = openSelect('op2');

export const LoadingOpen = Template.bind({});
LoadingOpen.args = {
	loading: true,
	loadingText: 'Loading options',
};
LoadingOpen.parameters = { visual: { target: 'viewport' } };
LoadingOpen.play = openSelect('Loading options');

export const Filterable = Template.bind({});
Filterable.args = {
	filterable: true,
	defaultFirstOption: true,
};

const selects = ['large', 'medium', 'small', 'mini']
	.map(
		(size) =>
			`<n8n-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange" size="${size}"><n8n-option value="1">op1</n8n-option><n8n-option value="2">op2</n8n-option></n8n-select>`,
	)
	.join('');

const ManyTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSelect,
		N8nOption,
		N8nIcon,
	},
	template: `<div style="display: flex; flex-direction: column; gap: var(--spacing--xs);">${selects}</div>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Sizes = ManyTemplate.bind({});
Sizes.args = {
	type: 'text',
	label: 'text input:',
	placeholder: 'placeholder...',
};

const selectsWithIcon = ['xlarge', 'large', 'medium', 'small', 'mini']
	.map(
		(size) =>
			`<n8n-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" size="${size}"><n8n-icon icon="search" slot="prefix" /><n8n-option value="1">op1</n8n-option><n8n-option value="2">op2</n8n-option></n8n-select>`,
	)
	.join('');

const ManyTemplateWithIcon: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSelect,
		N8nOption,
		N8nIcon,
	},
	template: `<div style="display: flex; flex-direction: column; gap: var(--spacing--xs);">${selectsWithIcon}</div>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const WithIcon = ManyTemplateWithIcon.bind({});
WithIcon.args = {
	type: 'text',
	label: 'text input:',
	placeholder: 'placeholder...',
};

const LimitedWidthTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSelect,
		N8nOption,
		N8nIcon,
	},
	template:
		'<div style="width:100px;"><n8n-select v-bind="args" v-model="val" @update:modelValue="onUpdateModelValue" @change="onChange"><n8n-option value="1" label="opt1 11 1111" /><n8n-option value="2" label="opt2 test very long ipsum"/></n8n-select></div>',
	data() {
		return {
			val: '',
		};
	},
	methods,
});

export const LimitedWidth = LimitedWidthTemplate.bind({});
LimitedWidth.args = {
	type: 'text',
	label: 'text input:',
	placeholder: 'placeholder...',
};
