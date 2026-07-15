import type { Meta, StoryObj } from '@storybook/vue3-vite';

import { CODE_BLOCK_LANGUAGES } from './CodeBlock.types';
import N8nCodeBlock from './CodeBlock.vue';

const meta = {
	title: 'Core/CodeBlock',
	component: N8nCodeBlock,
	argTypes: {
		language: {
			control: 'select',
			options: CODE_BLOCK_LANGUAGES,
		},
	},
	args: {
		code: `const workflow = {
	name: 'Example workflow',
	active: true,
};`,
		language: 'typescript',
		copyable: true,
		collapsed: true,
		maxHeight: 280,
		ariaLabel: 'Example TypeScript code',
	},
} satisfies Meta<typeof N8nCodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Json: Story = {
	args: {
		code: JSON.stringify({ name: 'Example workflow', active: true }, null, 2),
		language: 'json',
	},
};
