/* eslint-disable @typescript-eslint/no-unsafe-call @typescript-eslint/no-unsafe-member-access @typescript-eslint/no-unsafe-assignment */
import type { StoryFn } from '@storybook/vue';
import N8nRecycleScroller from './RecycleScroller.vue';
import { ComponentInstance } from 'vue';

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
			items: Array.from(Array(256).keys()).map((i) => ({ id: i })) as Array<{
				id: number;
				height: number;
			}>,
		};
	},
	methods: {
		resizeItem(item: { id: string; height: string }, fn: (id: string) => void) {
			const itemRef = (this as ComponentInstance).$refs[`item-${item.id}`] as HTMLElement;

			item.height = '200px';
			itemRef.style.height = '200px';
			fn(item.id);
		},
		getItemStyle(item: { id: string; height?: string }) {
			return {
				height: item.height || '100px',
				backgroundColor: `hsl(${parseInt(item.id, 10) * 1.4}, 100%, 50%)`,
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			};
		},
	},
	template: `<div style="height: 500px; width: 100%; overflow: auto">
		<N8nRecycleScroller :items="items" :item-size="100" item-key="id" v-bind="$props">
			<template	#default="{ item, setItemSize }">
				<div
					:ref="'item-' + item.id"
					:style="getItemStyle(item)"
					@click="resizeItem(item, setItemSize)"
				>
					{{item.id}}
				</div>
			</template>
		</N8nRecycleScroller>
	</div>`,
});

export const RecycleScroller = Template.bind({});
