import type { StoryFn } from '@storybook/vue';
import N8nRecycleScroller from './RecycleScroller.vue';

export default {
	title: 'Atoms/RecycleScroller',
	component: N8nRecycleScroller,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nRecycleScroller,
	},
	template: `<div style="height: 500px; width: 100%; overflow: auto">
		<N8nRecycleScroller :items="items" :item-size="100" item-key="id" v-bind="$props">
			<template	#default="{ item }">
				<div :style="{ height: '100px', backgroundColor: 'hsl(' + (item.id * 1.4) + ', 100%, 50%)' }">{{item.id}}</div>
			</template>
		</N8nRecycleScroller>
	</div>`,
});

export const RecycleScroller = Template.bind({});
RecycleScroller.args = {
	items: Array.from(Array(256).keys()).map((i) => ({ id: i })),
};
