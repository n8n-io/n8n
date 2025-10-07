<script setup lang="ts">
import type { BaseTextKey } from '@n8n/i18n';
import { useLogStreamingStore } from '../logStreaming.store';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';

import { ElCheckbox as Checkbox, type CheckboxValueType } from 'element-plus';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';

interface Props {
	destinationId?: string;
	readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	destinationId: 'defaultDestinationId',
	readonly: false,
});

const emit = defineEmits<{
	input: [];
	change: [payload: { name: string; node: string; value: CheckboxValueType }];
}>();

const i18n = useI18n();
const logStreamingStore = useLogStreamingStore();

const anonymizeAuditMessages = computed(
	() => logStreamingStore.items[props.destinationId]?.destination.anonymizeAuditMessages,
);

function onInput() {
	emit('input');
}

function onCheckboxChecked(eventName: string, checked: CheckboxValueType) {
	logStreamingStore.setSelectedInGroup(props.destinationId, eventName, Boolean(checked));
}

function anonymizeAuditMessagesChanged(value: CheckboxValueType) {
	logStreamingStore.items[props.destinationId].destination.anonymizeAuditMessages = Boolean(value);
	emit('change', { name: 'anonymizeAuditMessages', node: props.destinationId, value });
}

function groupLabelName(t: string): string {
	return i18n.baseText(`settings.log-streaming.eventGroup.${t}` as BaseTextKey) ?? t;
}

function groupLabelInfo(t: string): string | undefined {
	const labelInfo = `settings.log-streaming.eventGroup.${t}.info`;
	const infoText = i18n.baseText(labelInfo as BaseTextKey);
	if (infoText === labelInfo || infoText === '') return;
	return infoText;
}
</script>

<template>
	<div>
		<div
			v-for="group in logStreamingStore.items[destinationId]?.eventGroups"
			:key="group.name"
			shadow="never"
		>
			<!-- <template #header> -->
			<Checkbox
				:model-value="group.selected"
				:indeterminate="group.indeterminate"
				:disabled="readonly"
				@update:model-value="onInput"
				@change="onCheckboxChecked(group.name, $event)"
			>
				<strong>{{ groupLabelName(group.name) }}</strong>
				<N8nTooltip
					v-if="groupLabelInfo(group.name) !== undefined"
					placement="top"
					:popper-class="$style.tooltipPopper"
					class="ml-xs"
				>
					<N8nIcon icon="circle-help" size="small" class="ml-4xs" />
					<template #content>
						{{ groupLabelInfo(group.name) }}
					</template>
				</N8nTooltip>
			</Checkbox>
			<Checkbox
				v-if="group.name === 'n8n.audit'"
				:model-value="anonymizeAuditMessages"
				:disabled="readonly"
				@update:model-value="onInput"
				@change="anonymizeAuditMessagesChanged"
			>
				{{ i18n.baseText('settings.log-streaming.tab.events.anonymize') }}
				<N8nTooltip placement="top" :popper-class="$style.tooltipPopper">
					<N8nIcon icon="circle-help" size="small" class="ml-4xs" />
					<template #content>
						{{ i18n.baseText('settings.log-streaming.tab.events.anonymize.info') }}
					</template>
				</N8nTooltip>
			</Checkbox>
			<!-- </template> -->
			<ul :class="$style.eventList">
				<li v-for="event in group.children" :key="event.name" :class="`${$style.eventListItem}`">
					<Checkbox
						:model-value="event.selected || group.selected"
						:indeterminate="event.indeterminate"
						:disabled="readonly"
						@update:model-value="onInput"
						@change="onCheckboxChecked(event.name, $event)"
					>
						{{ event.label }}
						<N8nTooltip placement="top" :popper-class="$style.tooltipPopper">
							<template #content>
								{{ event.name }}
							</template>
						</N8nTooltip>
					</Checkbox>
				</li>
			</ul>
		</div>
	</div>
</template>

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
