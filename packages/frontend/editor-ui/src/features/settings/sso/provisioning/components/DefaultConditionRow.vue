<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import InstanceRoleAssignmentSelect from './InstanceRoleAssignmentSelect.vue';

const modelValue = defineModel<string>({ required: true });

const {
	label,
	disabled = false,
	standalone = false,
} = defineProps<{
	// Descriptive text shown before the assign dropdown, e.g. "Default condition …".
	label: string;
	disabled?: boolean;
	// When true the row renders as a self-contained bordered card (Mode 2); when
	// false it renders as the last row inside the rule table (Mode 1).
	standalone?: boolean;
}>();

const i18n = useI18n();
</script>
<template>
	<div
		:class="[$style.defaultRow, { [$style.standalone]: standalone }]"
		data-test-id="default-condition-row"
	>
		<div :class="$style.defaultCellIcon">
			<N8nIcon icon="lock" size="small" color="text-light" />
		</div>
		<div :class="$style.defaultCellText">{{ label }}</div>
		<div :class="$style.defaultCellRole">
			<span :class="$style.label">{{
				i18n.baseText('settings.sso.settings.roleMappingRules.assign')
			}}</span>
			<InstanceRoleAssignmentSelect
				v-model="modelValue"
				:disabled="disabled"
				test-id="default-condition-role-select"
			/>
		</div>
		<div v-if="!standalone" :class="$style.defaultCellSpacer" />
	</div>
</template>
<style lang="scss" module>
.defaultRow {
	display: flex;
	align-items: center;
	height: 48px;
	background: var(--color--foreground--tint-2);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

// Self-contained card for standalone use (no surrounding rule table).
.standalone {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
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

// Give the dropdown a touch more breathing room when the row stands alone.
.standalone .defaultCellRole {
	padding-right: var(--spacing--sm);
}
</style>
