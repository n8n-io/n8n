<template>
	<el-checkbox-group v-model="levelCheckList" @change="onGroupChange">
		<el-checkbox v-for="level in storedEventLevels" :label="level" :value="level" :key="level" />
	</el-checkbox-group>
</template>

<script lang="ts">
	import { CheckboxGroup as ElCheckboxGroup} from 'element-ui';
import { EventMessageLevel } from 'n8n-workflow';
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
				levelCheckList: [] as EventMessageLevel[],
			};
		},
		computed: {
			...mapStores(
				useEventTreeStore,
			),
			storedEventLevels() {
				console.log(Object.values(EventMessageLevel), this.levelCheckList, this.eventTreeStore.getSelectedLevels(this.destinationId));
				return Object.values(EventMessageLevel);
			},
		},
		mounted() {
			this.levelCheckList = this.eventTreeStore.getSelectedLevels(this.destinationId);
		},
		methods: {
			onGroupChange() {
				this.$emit('input');
				this.eventTreeStore.setSelectedLevels(this.destinationId, this.levelCheckList);
			},
		},
  };
</script>
