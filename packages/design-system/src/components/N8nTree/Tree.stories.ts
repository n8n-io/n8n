import N8nTree from './Tree.vue';
import type { StoryFn } from '@storybook/vue';

export default {
	title: 'Atoms/Tree',
	component: N8nTree,
};

export const Default: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nTree,
	},
	template: `<n8n-tree v-bind="$props">
		<template v-slot:label="{ label }">
			<span>{{ label }}</span>
		</template>
		<template v-slot:value="{ value }">
			<span>{{ value }}</span>
		</template>
	</n8n-tree>`,
});

Default.args = {
	value: {
		objectKey: {
			nestedArrayKey: ['in progress', 33958053],
			stringKey: 'word',
			aLongKey:
				'Lorem ipsum dolor sit consectetur adipiscing elit. Sed dignissim aliquam ipsum mattis pellentesque. Phasellus ut ligula fermentum orci elementum dignissim. Vivamus interdum risus eget nibh placerat ultrices. Vivamus orci arcu, iaculis in nulla non, blandit molestie magna. Praesent tristique feugiat odio non vehicula. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse fermentum purus diam, nec auctor elit consectetur nec. Vestibulum ultrices diam magna, in faucibus odio bibendum id. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sollicitudin lacus neque.',
			objectKey: {
				myKey: "what's for lunch",
				yourKey: 'prolle rewe wdyt',
			},
			id: 123,
		},
		hello: 'world',
		test: {
			label: 'A cool folder',
			children: [
				{
					label: 'A cool sub-folder 1',
					children: [{ label: 'A cool sub-sub-folder 1' }, { label: 'A cool sub-sub-folder 2' }],
				},
				{ label: 'This one is not that cool' },
			],
		},
	},
};
