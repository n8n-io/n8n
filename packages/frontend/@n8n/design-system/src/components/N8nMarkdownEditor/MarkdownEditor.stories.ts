import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nMarkdownEditor from './MarkdownEditor.vue';

const defaultMarkdown = `# Agent instructions

Write clear, concise responses.

- Use the available tools when needed
- Ask for clarification when requirements are ambiguous
- Keep answers grounded in the current workflow

> Prefer practical implementation details over abstract advice.

Use **bold** for important labels and *italics* for nuance.`;

const gfmMarkdown = `# GFM coverage

## Task list

- [x] Parse markdown strings
- [x] Render rich text blocks
- [ ] Add production toolbar controls

## Table

| Feature | Status |
| --- | --- |
| Headings | Supported |
| Tables | Supported |
| Task lists | Supported |

## Formatting

This includes ~~strikethrough~~, [links](https://n8n.io), inline \`code\`, and fenced code blocks.

\`\`\`ts
const value = editor.getMarkdown();
\`\`\``;

const longInstructionsMarkdown = `# Customer support agent

You are a customer support assistant for an automation platform.

## Response style

- Be direct and specific.
- Explain assumptions before giving steps.
- Use numbered steps for procedures.
- Do not invent product capabilities.

## Escalation rules

Escalate to a human when:

1. The user reports data loss.
2. The user asks for billing changes.
3. The user shares credentials or secrets.
4. The answer depends on private account data.

## Tooling

When a workflow error is provided, identify the failing node, summarize the likely cause, and suggest the smallest next diagnostic step.`;

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onInput: action('input'),
	onChange: action('change'),
	onFocus: action('focus'),
	onBlur: action('blur'),
	onReady: action('ready'),
};

export default {
	title: 'Core/Markdown Editor',
	component: N8nMarkdownEditor,
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'textbox'],
		},
		showToolbar: {
			control: 'select',
			options: ['never', 'hover', 'always'],
		},
		maxHeight: {
			control: 'text',
		},
		disabled: {
			control: 'boolean',
		},
		readonly: {
			control: 'boolean',
		},
		placeholder: {
			control: 'text',
		},
		modelValue: {
			control: 'text',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A rich-text Markdown editor backed by TipTap, with Markdown string input/output and design-system managed styling.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nMarkdownEditor,
	},
	data() {
		return {
			value: args.modelValue,
		};
	},
	watch: {
		'args.modelValue'(value: string) {
			this.value = value;
		},
	},
	template: `
		<div style="max-width: 760px; display: flex; flex-direction: column; gap: 16px;">
			<n8n-markdown-editor
				v-bind="args"
				v-model="value"
				@update:modelValue="onUpdateModelValue"
				@input="onInput"
				@change="onChange"
				@focus="onFocus"
				@blur="onBlur"
				@ready="onReady"
			/>
		</div>
	`,
	methods,
});

export const Default = Template.bind({});
Default.args = {
	modelValue: defaultMarkdown,
	variant: 'default',
	placeholder: 'Write Markdown...',
	showToolbar: 'hover',
	maxHeight: '480px',
	disabled: false,
	readonly: false,
};

export const Textbox = Template.bind({});
Textbox.args = {
	...Default.args,
	variant: 'textbox',
};

export const WithoutToolbar = Template.bind({});
WithoutToolbar.args = {
	...Default.args,
	showToolbar: 'never',
};

export const AlwaysVisibleToolbar = Template.bind({});
AlwaysVisibleToolbar.args = {
	...Default.args,
	showToolbar: 'always',
};

export const GfmContent = Template.bind({});
GfmContent.args = {
	...Default.args,
	modelValue: gfmMarkdown,
	variant: 'textbox',
};

export const Disabled = Template.bind({});
Disabled.args = {
	...Default.args,
	disabled: true,
	variant: 'textbox',
};

export const Readonly = Template.bind({});
Readonly.args = {
	...Default.args,
	readonly: true,
	variant: 'textbox',
};

export const LongInstructions = Template.bind({});
LongInstructions.args = {
	...Default.args,
	modelValue: longInstructionsMarkdown,
	variant: 'textbox',
};

export const Empty = Template.bind({});
Empty.args = {
	...Default.args,
	modelValue: '',
	showToolbar: 'never',
	variant: 'textbox',
	placeholder: 'Write instructions...',
};
