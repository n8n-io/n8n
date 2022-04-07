<template>
	<div>
		<n8n-menu-item
			v-for="item in items"
			:key="item.id"
			:index="item.id"
			@click="onClick(item)"
		>
			<font-awesome-icon :icon="item.properties.icon" />
			<span slot="title" :class="{'item-title-root': root, 'item-title': !root}">{{ item.properties.title }}</span>
		</n8n-menu-item>
	</div>
</template>

<script lang="ts">

import { IMenuItem } from '../Interface';
import Vue from 'vue';

export default Vue.extend({
	name: 'MenuItemsIterator',
	props: [
		'items',
		'root',
		'afterItemClick',
	],
	methods: {
		onClick(item: IMenuItem) {
			if (item && item.type === 'link' && item.properties) {
				const href = item.properties.href;
				if (!href) {
					return;
				}

				if (item.properties.newWindow) {
					window.open(href);
				}
				else {
					window.location.assign(item.properties.href);
				}

				if(this.afterItemClick) {
					this.afterItemClick(item.id);
				}
			}
		},
	},
});
</script>
