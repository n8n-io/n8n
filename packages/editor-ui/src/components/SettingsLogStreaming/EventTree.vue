<template>
	<div :style="{ 'margin-left': (depth ?? 0) * 10 + 'px' }">
		<div>
				<span v-if="isFolder" @click="toggleFolder" :class="$style['folder-icon']">
					<font-awesome-icon v-if="isOpen" icon="chevron-down" size="xs" slot="prefix"/>
					<font-awesome-icon v-else icon="chevron-right" size="xs" slot="prefix"/>
				</span>
			<el-checkbox :value="isChecked" :indeterminate="isIndeterminate" @change="onCheckboxChecked($event, item?._name)">
						<span :class="item?._selected ? $style.bold : ''">{{ item?.label }}</span>
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
			</ul>
			</Transition>
		</div>
	</div>
</template>

<script lang="ts">
	import ElCheckbox from 'element-ui/lib/checkbox';
	import { mapStores } from 'pinia';
	import { useEventTreeStore } from './eventTreeStore';

	export class EventNamesTreeCollection {
		label = '';
		_selected? = false;
		_indeterminate? = false;
		_name = '';
		children: EventNamesTreeCollection[] = [];
	}

	interface ParentEventTree extends Vue {
		setChildChecked(checked:boolean):void
	}

  export default {
		name: 'event-tree',
		props: {
			item: EventNamesTreeCollection,
			depth: {
				type: Number,
				default: 0,
			},
		},
		data() {
			return {
				isOpen: this.depth === 0,
				isChecked: this.item?._selected,
				isIndeterminate: !this.item?._selected && this.item?._indeterminate,
				childChecked: false,
			};
		},
		computed: {
			...mapStores(
				useEventTreeStore,
			),
			isFolder() {
				return this.item && this.item.children.length > 0;
			},
		},
		methods: {
			toggleFolder() {
				if (this.isFolder) {
					this.isOpen = !this.isOpen;
				}
			},
			setChildChecked(childChecked: boolean) {
				this.isIndeterminate = !this.isChecked && childChecked;
				if (this.$parent) {
					try {
						(this.$parent as ParentEventTree).setChildChecked(this.isChecked || childChecked || this.childChecked);
					} catch (error) {}
				}
				// moved to the end intentionally so that an item in the middle of the tree could be removed but
				// the indeterminate flag stays set on parents further down.
				// normally this should be at the top...
				this.childChecked = childChecked;
			},
			onCheckboxChecked(checked: boolean, name:string|undefined) {
				if (name) {
					if (checked) {
						this.eventTreeStore.addSelected(name);
					} else {
						this.eventTreeStore.removeSelected(name);
					}
					this.isChecked = checked;
					this.setChildChecked(checked);
				}
				console.log(this.eventTreeStore.selected);
			},
		},
  };
</script>

<style lang="scss" module>
.folder-icon {
	margin-right: .6em;
}
.bold {
  font-weight: bold;
}
</style>
