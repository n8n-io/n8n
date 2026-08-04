import type { StoryFn } from '@storybook/vue3-vite';

import N8nTag from './Tag.vue';
import N8nTags from '../N8nTags/Tags.vue';

export default {
	title: 'Core/Tag',
	component: N8nTag,
	argTypes: {
		text: {
			control: {
				control: 'text',
			},
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
};

const SingleTagTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nTag,
	},
	template: '<n8n-tag v-bind="args"></n8n-tag>',
});

export const SingleTag = SingleTagTemplate.bind({});
SingleTag.args = {
	text: 'tag name',
	size: 'sm',
};

export const MediumTag = SingleTagTemplate.bind({});
MediumTag.args = {
	text: 'tag name',
	size: 'md',
};

export const LargeTag = SingleTagTemplate.bind({});
LargeTag.args = {
	text: 'tag name',
	size: 'lg',
};

const TagListTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nTags,
	},
	template: '<n8n-tags v-bind="args"></n8n-tags>',
});

export const TagList = TagListTemplate.bind({});
TagList.args = {
	tags: [
		{
			id: 1,
			name: 'very long tag name',
		},
		{
			id: 2,
			name: 'tag1',
		},
		{
			id: 3,
			name: 'tag2 yo',
		},
	],
};

export const TruncatedTagList = TagListTemplate.bind({});
TruncatedTagList.args = {
	truncate: true,
	tags: [
		{
			id: 1,
			name: 'very long tag name',
		},
		{
			id: 2,
			name: 'tag1',
		},
		{
			id: 3,
			name: 'tag2 yo',
		},
		{
			id: 4,
			name: 'tag3',
		},
		{
			id: 5,
			name: 'tag4',
		},
	],
};
