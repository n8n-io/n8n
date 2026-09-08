import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nCopyInput from './CopyInput.vue';

const meta = {
	title: 'Core/CopyInput',
	component: N8nCopyInput,
	argTypes: {
		size: {
			control: 'select',
			options: ['xlarge', 'large', 'medium', 'small', 'mini'],
		},
		disabled: {
			control: 'boolean',
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A readonly input with an attached copy button, rendered as one continuous bordered field. ' +
					'Clicking the field selects the whole value; the copy button and Cmd/Ctrl+C both write the ' +
					'full `value` to the clipboard and morph the copy icon into a check mark. Use `displayValue` ' +
					'to show a truncated secret while still copying the full value.',
			},
		},
	},
} satisfies Meta<typeof N8nCopyInput>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
	args: {
		label: 'API key',
		value: 'n8n_api_3f9d2c1b8a7e6f5d4c3b2a1908f7e6d5c4b3a291',
	},
} satisfies Story;

export const TruncatedSecret = {
	args: {
		label: 'API key',
		value: 'n8n_api_3f9d2c1b8a7e6f5d4c3b2a1908f7e6d5c4b3a291',
		displayValue: 'n8n_api_3f9d2c1b8a7e...6d5c4b3a291',
	},
} satisfies Story;

export const Disabled = {
	args: {
		label: 'Webhook URL',
		value: 'https://example.n8n.cloud/webhook/abcd-1234',
		disabled: true,
	},
} satisfies Story;

export const Sizes = {
	render: (args) => ({
		components: { N8nCopyInput },
		setup: () => ({ args }),
		template: `
		<div style="display: flex; gap: var(--spacing--md); align-items: flex-start;">
			<div style="display: grid; gap: var(--spacing--3xs);">
				<N8nCopyInput v-bind="args" size="xlarge" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					xlarge (40px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<N8nCopyInput v-bind="args" size="large" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					large (36px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<N8nCopyInput v-bind="args" size="medium" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					medium (32px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<N8nCopyInput v-bind="args" size="small" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					small (28px)
				</span>
			</div>
			<div style="display: grid; gap: var(--spacing--3xs);">
				<N8nCopyInput v-bind="args" size="mini" />
				<span style="font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					mini (24px)
				</span>
			</div>
		</div>
		`,
	}),
	args: {
		label: 'Webhook URL',
		value: 'https://example.n8n.cloud/webhook/abcd-1234',
	},
} satisfies Story;
