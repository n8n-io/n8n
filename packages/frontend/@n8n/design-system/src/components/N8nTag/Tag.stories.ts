import type { Meta, StoryObj } from '@storybook/vue3-vite';

import N8nTag from './Tag.vue';
import N8nTags from '../N8nTags/Tags.vue';

const meta = {
	title: 'Core/Tag',
	component: N8nTag,
	argTypes: {
		text: {
			control: 'text',
		},
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A compact tag or chip component for displaying labels and metadata.',
			},
		},
	},
} satisfies Meta<typeof N8nTag>;

export default meta;
type Story = StoryObj<typeof meta>;
type TagsStory = StoryObj<typeof N8nTags>;

export const Default: Story = {
	render: (args) => ({
		components: { N8nTag },
		setup() {
			return { args };
		},
		template: '<N8nTag v-bind="args" />',
	}),
	args: {
		text: 'tag name',
		size: 'sm',
	},
};

export const Sizes: Story = {
	render: () => ({
		components: { N8nTag },
		template: `
			<div style="display: flex; gap: 12px; align-items: center;">
				<N8nTag text="tag name" size="sm" />
				<N8nTag text="tag name" size="md" />
				<N8nTag text="tag name" size="lg" />
			</div>
		`,
	}),
	args: {
		text: 'tag name',
	},
};

export const TagList: TagsStory = {
	render: (args) => ({
		components: { N8nTags },
		setup() {
			return { args };
		},
		template: '<N8nTags v-bind="args" />',
	}),
	args: {
		tags: [
			{ id: '1', name: 'very long tag name' },
			{ id: '2', name: 'tag1' },
			{ id: '3', name: 'tag2 yo' },
		],
	},
};

export const TruncatedTagList: TagsStory = {
	render: (args) => ({
		components: { N8nTags },
		setup() {
			return { args };
		},
		template: '<N8nTags v-bind="args" />',
	}),
	args: {
		truncate: true,
		tags: [
			{ id: '1', name: 'very long tag name' },
			{ id: '2', name: 'tag1' },
			{ id: '3', name: 'tag2 yo' },
			{ id: '4', name: 'tag3' },
			{ id: '5', name: 'tag4' },
		],
	},
};
