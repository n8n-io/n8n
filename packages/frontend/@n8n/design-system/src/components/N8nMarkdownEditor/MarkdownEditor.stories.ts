import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { computed, ref } from 'vue';

import N8nMarkdownEditor from './MarkdownEditor.vue';

/** Full agent instructions with bullets, a table, and links, as used in all stories. */
const agentInstructionsMarkdown = `# Agent instructions

You are a workflow assistant for an automation platform. Follow these rules in every response.

## General behavior

- Answer with short sentences and the active voice.
- Use the available tools before you guess an answer.
- Ask for clarification when the user's request is ambiguous.
- Ground every claim in the current workflow or linked documentation.

## Node guidance

Refer to the table below before you suggest a node.

| Task | Node | Notes |
| --- | --- | --- |
| Call an HTTP endpoint | HTTP Request | Set the retry option for flaky APIs |
| Transform data in place | Code | Keep the code under 50 lines |
| Split items for parallel work | Loop Over Items | Use with a Merge node to rejoin |
| Send a message on completion | Slack | Prefer credentials over tokens |

## Useful references

- Read the [workflow docs](https://docs.n8n.io/workflows/) for editor basics.
- Check the [HTTP Request node docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/) for request options.
- See the [coding guidelines](https://docs.n8n.io/code/) before you write expressions.

> When a request needs a capability that no node covers, say so and propose the closest safe alternative.`;

const meta: Meta<typeof N8nMarkdownEditor> = {
	title: 'Core/MarkdownEditor',
	component: N8nMarkdownEditor,
	argTypes: {
		variant: {
			control: 'select',
			options: ['ghost', 'contained'],
		},
		showToolbar: {
			control: 'select',
			options: ['never', 'hover', 'always', 'floating'],
		},
		maxHeight: {
			control: 'text',
		},
		isCollapsible: {
			control: 'boolean',
		},
		allowExpandedView: {
			control: 'boolean',
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
	render: (args) => ({
		components: { N8nMarkdownEditor },
		setup() {
			const value = ref(args.modelValue);
			const editorArgs = computed(() => {
				const { modelValue: _modelValue, ...rest } = args;
				return rest;
			});

			return {
				value,
				editorArgs,
				onUpdateModelValue: action('update:modelValue'),
				onInput: action('input'),
				onFocus: action('focus'),
				onBlur: action('blur'),
				onReady: action('ready'),
			};
		},
		template: `
			<div style="max-width: 760px; display: flex; flex-direction: column; gap: 16px;">
				<n8n-markdown-editor
					v-bind="editorArgs"
					v-model="value"
					@update:modelValue="onUpdateModelValue"
					@input="onInput"
					@focus="onFocus"
					@blur="onBlur"
					@ready="onReady"
				/>
			</div>
		`,
	}),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		modelValue: agentInstructionsMarkdown,
		variant: 'contained',
		placeholder: 'Write Markdown...',
		showToolbar: 'always',
		maxHeight: '480px',
		isCollapsible: false,
		allowExpandedView: false,
		disabled: false,
		readonly: false,
	},
};

export const Ghost: Story = {
	args: {
		...Default.args,
		variant: 'ghost',
		showToolbar: 'floating',
		maxHeight: '320px',
	},
	parameters: {
		docs: {
			description: {
				story:
					'A more minimalist variant with a floating bubble menu toolbar. Select text to show the bubble menu.',
			},
		},
	},
};

export const Readonly: Story = {
	render: (args) => ({
		components: { N8nMarkdownEditor },
		setup() {
			const value = ref(args.modelValue);
			const readonly = ref(true);
			const editorArgs = computed(() => {
				const { modelValue: _modelValue, readonly: _readonly, ...rest } = args;
				return { ...rest, readonly: readonly.value };
			});

			function toggleReadonly() {
				readonly.value = !readonly.value;
			}

			return {
				value,
				readonly,
				editorArgs,
				toggleReadonly,
				onUpdateModelValue: action('update:modelValue'),
				onInput: action('input'),
				onFocus: action('focus'),
				onBlur: action('blur'),
				onReady: action('ready'),
			};
		},
		template: `
			<div style="max-width: 760px; display: flex; flex-direction: column; gap: 16px;">
				<label style="display: flex; align-items: center; gap: 8px;">
					<input type="checkbox" :checked="readonly" @change="toggleReadonly" />
					<span>Read-only</span>
				</label>
				<n8n-markdown-editor
					v-bind="editorArgs"
					v-model="value"
					@update:modelValue="onUpdateModelValue"
					@input="onInput"
					@focus="onFocus"
					@blur="onBlur"
					@ready="onReady"
				/>
			</div>
		`,
	}),
	args: {
		...Default.args,
		readonly: true,
	},
};

export const Expanded: Story = {
	args: {
		...Default.args,
		allowExpandedView: true,
		maxHeight: '320px',
	},
	parameters: {
		docs: {
			description: {
				story:
					'Allow for editing in dialog mode. Open the expanded view from the toolbar, edit there, and close to return.',
			},
		},
	},
};

export const Collapsible: Story = {
	args: {
		...Default.args,
		variant: 'ghost',
		showToolbar: 'never',
		readonly: true,
		isCollapsible: true,
		maxHeight: '480px',
	},
	parameters: {
		docs: {
			description: {
				story:
					'Prefer use with the ghost and read-only options. The editor collapses when content exceeds the collapsed height.',
			},
		},
	},
};
