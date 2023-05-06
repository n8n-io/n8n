<template>
	<div>
		<div
			v-for="group in logStreamingStore.items[destinationId]?.eventGroups"
			:key="group.name"
			shadow="never"
		>
			<!-- <template #header> -->
			<checkbox
				:value="group.selected"
				:indeterminate="!group.selected && group.indeterminate"
				@input="onInput"
				@change="onCheckboxChecked(group.name, $event)"
				:disabled="readonly"
			>
				<strong>{{ groupLabelName(group.name) }}</strong>
				<n8n-tooltip
					v-if="groupLabelInfo(group.name)"
					placement="top"
					:popper-class="$style.tooltipPopper"
					class="ml-xs"
				>
					<n8n-icon icon="question-circle" size="small" />
					<template #content>
						{{ groupLabelInfo(group.name) }}
					</template>
				</n8n-tooltip>
			</checkbox>
			<checkbox
				v-if="group.name === 'n8n.audit'"
				:value="logStreamingStore.items[destinationId]?.destination.anonymizeAuditMessages"
				@input="onInput"
				@change="anonymizeAuditMessagesChanged"
				:disabled="readonly"
			>
				{{ $locale.baseText('settings.log-streaming.tab.events.anonymize') }}
				<n8n-tooltip placement="top" :popper-class="$style.tooltipPopper">
					<n8n-icon icon="question-circle" size="small" />
					<template #content>
						{{ $locale.baseText('settings.log-streaming.tab.events.anonymize.info') }}
					</template>
				</n8n-tooltip>
			</checkbox>
			<!-- </template> -->
			<ul :class="$style.eventList">
				<li
					v-for="event in group.children"
					:key="event.name"
					:class="`${$style.eventListItem} ${group.selected ? $style.eventListItemDisabled : ''}`"
				>
					<checkbox
						:value="event.selected || group.selected"
						:indeterminate="event.indeterminate"
						:disabled="group.selected || readonly"
						@input="onInput"
						@change="onCheckboxChecked(event.name, $event)"
					>
						{{ event.label }}
						<n8n-tooltip placement="top" :popper-class="$style.tooltipPopper">
							<template #content>
								{{ event.name }}
							</template>
						</n8n-tooltip>
					</checkbox>
				</li>
			</ul>
		</div>
	</div>
</template>

<script lang="ts">
import { Checkbox } from 'element-ui';
import { mapStores } from 'pinia';
import type { BaseTextKey } from '../../plugins/i18n';
import { useLogStreamingStore } from '../../stores/logStreaming.store';

export default {
	name: 'event-selection',
	props: {
		destinationId: {
			type: String,
			default: 'defaultDestinationId',
		},
		readonly: Boolean,
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
		...mapStores(useLogStreamingStore),
		anonymizeAuditMessages() {
			return this.logStreamingStore.items[this.destinationId]?.destination.anonymizeAuditMessages;
		},
	},
	methods: {
		onInput() {
			this.$emit('input');
		},
		onCheckboxChecked(eventName: string, checked: boolean) {
			this.logStreamingStore.setSelectedInGroup(this.destinationId, eventName, checked);
			this.$forceUpdate();
		},
		anonymizeAuditMessagesChanged(value: boolean) {
			this.logStreamingStore.items[this.destinationId].destination.anonymizeAuditMessages = value;
			this.$emit('change', { name: 'anonymizeAuditMessages', node: this.destinationId, value });
			this.$forceUpdate();
		},
		groupLabelName(t: string): string {
			return this.$locale.baseText(`settings.log-streaming.eventGroup.${t}` as BaseTextKey) ?? t;
		},
		groupLabelInfo(t: string): string | undefined {
			const labelInfo = `settings.log-streaming.eventGroup.${t}.info`;
			const infoText = this.$locale.baseText(labelInfo as BaseTextKey);
			if (infoText === labelInfo || infoText === '') return;
			return infoText;
		},
	},
};
</script>

<style lang="scss" module>
.eventListCard {
	margin-left: 1em;
}

.eventList {
	height: auto;
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

.eventListItemDisabled > {
	label > {
		span > {
			span {
				background-color: transparent !important;
				&:after {
					border-color: rgb(54, 54, 54) !important;
				}
			}
		}
	}
}

.eventList .eventListItem + .listItem {
	margin-top: 10px;
}
</style>
