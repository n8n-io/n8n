<script lang="ts" setup>
import Draggable from 'vuedraggable';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	RoleMappingRuleResponse,
	RoleMappingRuleType,
} from '@n8n/rest-api-client/api/roleMappingRule';
import RuleRow from './RuleRow.vue';
import DefaultConditionRow from './DefaultConditionRow.vue';

const props = withDefaults(
	defineProps<{
		rules: RoleMappingRuleResponse[];
		fallbackRole?: string;
		type?: RoleMappingRuleType;
		projects?: Array<{ id: string; name: string }>;
		disabled?: boolean;
	}>(),
	{
		fallbackRole: 'global:member',
		type: 'instance',
		projects: () => [],
		disabled: false,
	},
);

const emit = defineEmits<{
	reorder: [fromIndex: number, toIndex: number];
	update: [id: string, patch: Partial<RoleMappingRuleResponse>];
	delete: [id: string];
	duplicate: [id: string];
	'update:fallbackRole': [value: string];
}>();

const i18n = useI18n();

function onDragEnd(event: { oldIndex?: number; newIndex?: number }) {
	if (
		event.oldIndex !== undefined &&
		event.newIndex !== undefined &&
		event.oldIndex !== event.newIndex
	) {
		emit('reorder', event.oldIndex, event.newIndex);
	}
}
</script>
<template>
	<div :class="$style.table" data-test-id="rule-list">
		<div :class="$style.headerRow">
			<div :class="$style.headerCellFull">Condition & Assignment</div>
		</div>
		<Draggable
			:model-value="props.rules"
			item-key="id"
			handle=".drag-handle"
			:animation="150"
			:disabled="props.disabled"
			:drag-class="$style.dragging"
			:ghost-class="$style.ghost"
			:chosen-class="$style.chosen"
			@end="onDragEnd"
		>
			<template #item="{ element, index }">
				<RuleRow
					:rule="element"
					:priority="index + 1"
					:type="props.type"
					:projects="props.projects"
					:disabled="props.disabled"
					@update="(id, patch) => emit('update', id, patch)"
					@delete="(id) => emit('delete', id)"
					@duplicate="(id) => emit('duplicate', id)"
				/>
			</template>
		</Draggable>
		<!-- Default condition row: instance rules assign a fallback role (or Block
		     access); project rules simply grant no access when nothing matches. -->
		<DefaultConditionRow
			v-if="props.type !== 'project'"
			:model-value="props.fallbackRole"
			:label="i18n.baseText('settings.sso.settings.roleMappingRules.defaultCondition.instance')"
			:disabled="props.disabled"
			@update:model-value="emit('update:fallbackRole', String($event))"
		/>
		<div v-else :class="$style.defaultRow">
			<div :class="$style.defaultCellIcon">
				<N8nIcon icon="lock" size="small" color="text-light" />
			</div>
			<div :class="$style.defaultCellText">
				{{ i18n.baseText('settings.sso.settings.roleMappingRules.defaultCondition.project') }}
			</div>
			<div :class="$style.defaultCellSpacer" />
		</div>
	</div>
</template>
<style lang="scss" module>
.table {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.headerRow {
	display: flex;
	align-items: center;
	height: 36px;
	background: var(--color--background);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.headerCellFull {
	flex: 1;
	padding: 0 var(--spacing--sm);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

.defaultRow {
	display: flex;
	align-items: center;
	height: 48px;
	background: var(--color--foreground--tint-2);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.defaultCellIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	// Match drag (32px) + priority (24px) = 56px from RuleRow
	width: 56px;
	padding: 0 var(--spacing--xs);
	flex-shrink: 0;
}

.defaultCellText {
	flex: 1;
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	padding: 0 var(--spacing--2xs);
	min-width: 0;
}

.defaultCellSpacer {
	// Match 2 × cellAction (24px each) from RuleRow
	width: 48px;
	flex-shrink: 0;
}

.ghost {
	opacity: 0.4;
}

.chosen {
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.dragging {
	opacity: 0.8;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
