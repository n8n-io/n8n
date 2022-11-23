<template>
	<el-checkbox-group v-model="levelCheckList" @change="onGroupChange">
		<el-checkbox v-for="level in storedEventLevels" :label="level" :value="level" :key="level" />
	</el-checkbox-group>
</template>

<script lang="ts">
	import { CheckboxGroup as ElCheckboxGroup} from 'element-ui';
	import { mapStores } from 'pinia';
	import { useEventTreeStore } from '../../stores/eventTreeStore';

  export default {
		name: 'event-level-selection',
		props: {
			destinationId: {
				type: String,
				default: 'default',
			},
		},
		components: {
			ElCheckboxGroup,
		},
		data() {
			return {
				unchanged: true,
				levelCheckList: [] as string[],
			};
		},
		computed: {
			...mapStores(
				useEventTreeStore,
			),
			storedEventLevels() {return Array.from(this.eventTreeStore.eventLevels.values());},
		},
		mounted() {
			this.levelCheckList = this.eventTreeStore.getSelectedLevels(this.destinationId);
		},
		methods: {
			onGroupChange() {
				this.$emit('input');
				console.log(this.destinationId, this.levelCheckList);
				this.eventTreeStore.setSelectedLevels(this.destinationId, this.levelCheckList);
			},
		},
  };
</script>
