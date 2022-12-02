<template>
	<div>
		<el-card v-for="group in logStreamingStore.items[destinationId].eventGroups"
		:key="group.name"
		:class="('box-card ' + $style.eventListCard)"
		shadow="never"
		>
			<template #header>
				<checkbox
					:value="group.selected"
					:indeterminate="!group.selected && group.indeterminate"
					@input="onInput"
					@change="onCheckboxChecked(group.name, $event)">
						<strong>{{groupLabelName(group.name)}}</strong>
				</checkbox>
			</template>
			<ul :class="$style.eventList">
				<li v-for="event in group.children" :key="event.name" :class="$style.eventListItem">
					<checkbox
						:value="event.selected"
						:indeterminate="event.indeterminate"
						:disabled="group.selected"
						@input="onInput"
						@change="onCheckboxChecked(event.name, $event)">
								{{ event.label }}
					</checkbox>
				</li>
			</ul>
		</el-card>
	</div>
</template>

<script lang="ts">
	import { Checkbox } from 'element-ui';
	import { mapStores } from 'pinia';
	import { BaseTextKey } from '../../plugins/i18n';
	import { useLogStreamingStore } from '../../stores/logStreamingStore';

  export default {
		name: 'event-selection',
		props: {
			destinationId: {
				type: String,
				default: 'defaultDestinationId',
			},
		},
		components: {
			Checkbox,
		},
		data() {
			return {
				unchanged: true,
			};
		},
		computed: {
			...mapStores(
				useLogStreamingStore,
			),
		},
		methods: {
			onInput() {
				this.$emit('input');
			},
			onCheckboxChecked(eventName: string, checked: boolean) {
				this.logStreamingStore.setSelectedInGroup(this.destinationId, eventName, checked);
				this.$forceUpdate();
			},
			groupLabelName(t: string): string {
				return this.$locale.baseText(`settings.logstreaming.eventGroup.${t}` as BaseTextKey) ?? t;
			},
		},
  };
</script>

<style lang="scss" module>
.eventListCard {

}
.eventList {
  height: auto;
	max-height: 300px;
	overflow-y: auto;
  padding: 0;
  margin: 0;
  list-style: none;
}
.eventList .eventListItem {
  display: flex;
  align-items: center;
  justify-content: left;
  margin: 10px;
  color: var(--el-color-primary);
}
.eventList .eventListItem + .listItem {
  margin-top: 10px;
}
</style>
