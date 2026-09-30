<script setup lang="ts">
import { computed, ref } from 'vue';
import type { McpToolPermission } from '@n8n/api-types';
import {
	N8nDropdownMenu,
	N8nSettingsRowButton,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		modelValue: McpToolPermission;
		custom?: boolean;
		disabled?: boolean;
		dataTestId?: string;
	}>(),
	{
		custom: false,
		disabled: false,
		dataTestId: undefined,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: McpToolPermission];
}>();

const i18n = useI18n();
const open = ref(false);
const permissions: McpToolPermission[] = ['always_allow', 'require_approval', 'blocked'];

const labels = computed<Record<McpToolPermission, string>>(() => ({
	always_allow: i18n.baseText('tools.connection.permissions.alwaysAllow'),
	require_approval: i18n.baseText('tools.connection.permissions.requireApproval'),
	blocked: i18n.baseText('tools.connection.permissions.blocked'),
}));

const selectedLabel = computed(() =>
	props.custom
		? i18n.baseText('tools.connection.permissions.custom')
		: labels.value[props.modelValue],
);

const items = computed<Array<DropdownMenuItemProps<McpToolPermission>>>(() =>
	permissions.map((id) => ({
		id,
		label: labels.value[id],
		checked: !props.custom && id === props.modelValue,
	})),
);
</script>

<template>
	<N8nDropdownMenu
		v-model="open"
		:items="items"
		:disabled="disabled"
		:data-test-id="dataTestId"
		placement="bottom-end"
		@select="emit('update:modelValue', $event)"
	>
		<template #trigger>
			<N8nSettingsRowButton :disabled="disabled" :expanded="open">
				<N8nText size="small" color="text-base">{{ selectedLabel }}</N8nText>
			</N8nSettingsRowButton>
		</template>
	</N8nDropdownMenu>
</template>
