<script lang="ts" setup>
import { computed } from 'vue';
import Draggable from 'vuedraggable';
import { N8nIcon, N8nOption, N8nSelect } from '@n8n/design-system';
import { useRolesStore } from '@/app/stores/roles.store';
import type {
	RoleMappingRuleResponse,
	RoleMappingRuleType,
} from '@n8n/rest-api-client/api/roleMappingRule';
import RuleRow from './RuleRow.vue';

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

const rolesStore = useRolesStore();

const EXCLUDED_GLOBAL_ROLES = ['global:owner', 'global:chatUser'];

const fallbackRoleOptions = computed(() =>
	rolesStore.roles.global
		.filter((role) => !EXCLUDED_GLOBAL_ROLES.includes(role.slug))
		.map((role) => ({ label: role.displayName, value: role.slug })),
);

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
		<!-- Default fallback row -->
		<div :class="$style.defaultRow">
			<div :class="$style.defaultCellIcon">
				<N8nIcon icon="lock" size="small" color="text-light" />
			</div>
			<div :class="$style.defaultCellText">
				{{
					props.type === 'project'
						? 'Default condition - If no rules match, no project access given'
						: 'Default condition - If no rules above match'
				}}
			</div>
			<div v-if="props.type !== 'project'" :class="$style.defaultCellRole">
				<span :class="$style.label">assign</span>
				<N8nSelect
					:model-value="props.fallbackRole"
					size="small"
					:disabled="props.disabled"
					data-test-id="fallback-role-select"
					:class="$style.fallbackSelect"
					@update:model-value="emit('update:fallbackRole', String($event))"
				>
					<N8nOption
						v-for="option in fallbackRoleOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</N8nSelect>
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

.defaultCellRole {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	flex-shrink: 0;
}

.defaultCellSpacer {
	// Match 2 × cellAction (24px each) from RuleRow
	width: 48px;
	flex-shrink: 0;
}

.label {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

.fallbackSelect {
	width: 130px;
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
