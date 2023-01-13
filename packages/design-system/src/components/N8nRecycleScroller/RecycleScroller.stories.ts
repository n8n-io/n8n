/* eslint-disable @typescript-eslint/no-unsafe-call @typescript-eslint/no-unsafe-member-access @typescript-eslint/no-unsafe-assignment */
import type { StoryFn } from '@storybook/vue';
import N8nRecycleScroller from './RecycleScroller.vue';

export default {
	title: 'Atoms/RecycleScroller',
	component: N8nRecycleScroller,
	argTypes: {},
};

const Template: StoryFn = () => ({
	components: {
		N8nRecycleScroller,
	},
	data() {
		return {
			items: Array.from(Array(256).keys()).map((i) => ({ id: i, height: 100 })) as Array<{
				id: number;
				height: number;
			}>,
		};
	},
	methods: {
		resizeItem({ id }, fn: (id: string, height: number) => void) {
			// const item = this.items.findIndex((item) => item.id === id);
			//
			// this.$set(this.items, `${item}`, { ...this.items[item], height: 200 });

			fn(id, 200);
		},
	},
	template: `<div style="height: 500px; width: 100%; overflow: auto">
		<N8nRecycleScroller :items="items" :item-size="100" item-key="id" v-bind="$props">
			<template	#default="{ item, setItemSize }">
				<div :style="{ height: item.height + 'px', backgroundColor: 'hsl(' + (item.id * 1.4) + ', 100%, 50%)' }">
					<a @click="resizeItem(item, setItemSize)">{{item.id}}</a>
				</div>
			</template>
		</N8nRecycleScroller>
	</div>`,
});

export const RecycleScroller = Template.bind({});
