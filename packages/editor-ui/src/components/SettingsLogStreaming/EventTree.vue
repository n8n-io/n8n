<template>
	<div :style="{ 'margin-left': (depth ?? 0) * 10 + 'px' }">
		<div>
				<!-- <font-awesome-icon icon="minus" size="sm" slot="prefix"/> -->
				<span v-if="isFolder" @click="toggle" :class="$style['folder-icon']">
					<!-- <font-awesome-icon icon="plus" size="sm"  slot="prefix"/> -->
				<!-- [{{ isOpen ? '-' : '+' }}]</span> -->
					<font-awesome-icon v-if="isOpen" icon="chevron-down" size="xs" slot="prefix"/>
					<font-awesome-icon v-else icon="chevron-right" size="xs" slot="prefix"/>
				</span>
			<el-checkbox :class="{bold: isFolder}">
						{{ item?.name }}
			</el-checkbox>
			<Transition name="slide-fade">
			<ul v-show="isOpen" v-if="isFolder">
				<event-tree
					class="item"
					v-for="(baby, index) in item?.children"
					:key="index"
					:item="baby"
					:depth="depth+1"
					@make-folder="$emit('make-folder', $event)"
					@add-item="$emit('add-item', $event)"
				></event-tree>
				<!-- <li class="add" @click="$emit('add-item', treeData)">+</li> -->
			</ul>
			</Transition>
		</div>
	</div>
</template>

<script lang="ts">
	class StringIndexedChild {
		name = '';
		children: StringIndexedChild[] = [];
	}

  export default {
		name: 'event-tree',
		props: {
			item: StringIndexedChild,
			depth: {
				type: Number,
				default: 0,
			},
		},
		data() {
			return {
				isOpen: false,
			};
		},
		computed: {
			isFolder() {
				console.log(this.item?.name);
				return this.item && this.item.children.length > 0;
			},
	},
	methods: {
			toggle() {
				if (this.isFolder) {
					this.isOpen = !this.isOpen;
				}
			},
			makeFolder() {
				if (!this.isFolder) {
					// this.$emit("make-folder", this.item);
					this.isOpen = true;
				}
			},
		},
  };
</script>

<style lang="scss" module>
.folder-icon {
	margin-right: .6em;
}
</style>
