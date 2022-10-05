<template>
	<n8n-menu default-active="owner" type="secondary" @select="onSelectOwner" ref="selectOwnerMenu">
		<n8n-menu-item index="owner">
			<template #title>
				<n8n-icon icon="user"/>
				<span class="ml-xs">
					{{ myResourcesLabel }}
				</span>
			</template>
		</n8n-menu-item>
		<n8n-menu-item index="all">
			<template #title>
				<n8n-icon icon="globe-americas"/>
				<span class="ml-xs">
					{{ allResourcesLabel }}
				</span>
			</template>
		</n8n-menu-item>
	</n8n-menu>
</template>

<script lang="ts">
import Vue from 'vue';
import {IUser} from "@/Interface";

export default Vue.extend({
	props: {
		value: {
			type: Boolean,
			default: true,
		},
		myResourcesLabel: {
			type: String,
			default: '',
		},
		allResourcesLabel: {
			type: String,
			default: '',
		},
	},
	methods: {
		onSelectOwner(type: string) {
			this.$emit('input', type === 'owner');
		},
	},
	watch: {
		value(active) {
			(this.$refs.selectOwnerMenu as Vue & { $children: Array<{ activeIndex: string; }> }).$children[0].activeIndex = active ? 'owner' : 'all';
		},
	},
});
</script>
