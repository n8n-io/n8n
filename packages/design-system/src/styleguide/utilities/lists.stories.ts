import type { StoryFn } from '@storybook/vue';

export default {
	title: 'Utilities/Lists',
};

const ListStyleNoneTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	template: `<ul class="list-style-none">
		<li>List item 1</li>
		<li>List item 2</li>
		<li>List item 3</li>
	</ul>`,
});

export const StyleNone = ListStyleNoneTemplate.bind({});

const ListInlineTemplate: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	template: `<ul class="list-inline">
		<li>List item 1</li>
		<li>List item 2</li>
		<li>List item 3</li>
	</ul>`,
});

export const Inline = ListInlineTemplate.bind({});
