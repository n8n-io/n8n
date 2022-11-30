<template>
	<div :style="{ 'margin-left': indentation + 'px' }">
		<div>
				<span v-if="isFolder" @click="toggleFolder" :class="$style['folder-icon']">
					<font-awesome-icon v-if="isOpen" icon="chevron-down" size="xs"/>
					<font-awesome-icon v-else icon="chevron-right" size="xs"/>
				</span>
			<el-checkbox
				:value="isChecked"
				:indeterminate="isIndeterminate"
				@input="onInput"
				@change="onCheckboxChecked">
						{{ item?.label }}
			</el-checkbox>
			<ul v-show="isOpen" v-if="isFolder">
				<event-tree-selection
					class="item"
					v-for="(baby, index) in item?.children"
					:key="index"
					:item="baby"
					:depth="depth+1"
					:destinationId="destinationId"
					@input="onInput"
				/>
			</ul>
		</div>
	</div>
</template>

<script lang="ts">
	import { Checkbox as ElCheckbox} from 'element-ui';
	import { mapStores } from 'pinia';
	import { EventNamesTreeCollection, useEventTreeStore } from '../../stores/eventTreeStore';



	interface ParentEventTree extends Vue {
		tellParentChildCheckChanged(checked:boolean):void
		onInput():void
	}

  export default {
		name: 'event-tree-selection',
		props: {
			item: EventNamesTreeCollection,
			destinationId: {
				type: String,
				default: 'default',
			},
			depth: {
				type: Number,
				default: 0,
			},
		},
		components: {
			ElCheckbox,
		},
		data() {
			return {
				isOpen: this.depth === 0,
				isChecked: this.item?._selected,
				isIndeterminate: !this.item?._selected && this.item?._indeterminate,
				unchanged: true,
			};
		},
		computed: {
			...mapStores(
				useEventTreeStore,
			),
			isFolder() {
				return this.item && this.item.children.length > 0;
			},
			indentation() {
				if (this.depth === 0) {
					return 0;
				} else {
					if (this.isFolder) {
						return this.depth * 30;
					} else {
						return this.depth * 30  - 10;
					}
				}
			},
		},
		methods: {
			toggleFolder() {
				if (this.isFolder) {
					this.isOpen = !this.isOpen;
				}
			},
			onInput() {
				this.$emit('input');
			},
			isAnyChildChecked() {
				let result: boolean | undefined;
				if (this.item) {
					if (this.item.children.length > 0) {
						this.item.children.forEach((child)=> {
							result = result || !!(child._selected || child._indeterminate);
						});
					} else {
						result = false;
					}
				} else {
					result = false;
				}
				return result;
			},
			computeIndeterminate(): boolean {
				const anyChildChecked = this.isAnyChildChecked();
				if (this.isChecked) {
					return false;
				}	else if (anyChildChecked === true && this.isChecked === false) {
					return true;
				} else if (anyChildChecked === false && this.isChecked === false) {
					return false;
				} else {
					return false;
				}
			},
			tellParentChildCheckChanged(someChildChecked: boolean) {
				this.isIndeterminate = this.computeIndeterminate();
				if (this.item) {
					this.eventTreeStore.setIndeterminateInTree(this.destinationId, this.item._name, this.isIndeterminate);
				}
				if (this.$parent) {
					try {
						(this.$parent as ParentEventTree).tellParentChildCheckChanged(
							(this.isChecked === true) || someChildChecked || (this.isIndeterminate === true));
					} catch (error) {}
				}
			},
			onCheckboxChecked(checked: boolean) {
				if (this.item?._name) {
					this.isChecked = checked;
					if (checked) {
						this.eventTreeStore.addSelectedEvent(this.destinationId, this.item._name);
					} else {
						this.eventTreeStore.removeSelectedEvent(this.destinationId, this.item._name);
					}
					this.tellParentChildCheckChanged(checked);
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
