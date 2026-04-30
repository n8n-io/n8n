<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import {
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system/v2/components/DropdownMenu';
import { useI18n } from '@n8n/i18n';

import { useToast } from '@/app/composables/useToast';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';

type ResourceActionsScope = {
	type: 'folder' | 'project';
	id: string;
	name: string;
};

type McpAccessAction = 'enableMcpAccess' | 'disableMcpAccess';

type MenuItemData = {
	tooltip: string;
};

const props = withDefaults(
	defineProps<{
		scope: ResourceActionsScope | null;
		disabled?: boolean;
	}>(),
	{
		disabled: false,
	},
);

const emit = defineEmits<{
	updated: [];
}>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const mcpStore = useMCPStore();

const isLoading = ref(false);

const scopeName = computed(() => props.scope?.name ?? '');
const settingsLink = computed(() => router.resolve({ name: MCP_SETTINGS_VIEW }).href);
const isDisabled = computed(() => props.disabled || isLoading.value || props.scope === null);

const menuItems = computed<Array<DropdownMenuItemProps<McpAccessAction, MenuItemData>>>(() => [
	{
		id: 'enableMcpAccess',
		label: i18n.baseText('resourceActions.mcpAccess.enable'),
		disabled: isDisabled.value,
		data: {
			tooltip: i18n.baseText('resourceActions.mcpAccess.enable.tooltip', {
				interpolate: { scopeName: scopeName.value },
			}),
		},
	},
	{
		id: 'disableMcpAccess',
		label: i18n.baseText('resourceActions.mcpAccess.disable'),
		disabled: isDisabled.value,
		data: {
			tooltip: i18n.baseText('resourceActions.mcpAccess.disable.tooltip', {
				interpolate: { scopeName: scopeName.value },
			}),
		},
	},
]);

function getTarget() {
	if (!props.scope) return null;

	return props.scope.type === 'folder'
		? { folderId: props.scope.id }
		: { projectId: props.scope.id };
}

function openSettingsFromToast(event?: MouseEvent) {
	if (!(event?.target instanceof HTMLAnchorElement)) return;

	event.preventDefault();
	void router.push(settingsLink.value);
}

function showMCPAccessSuccessToast(enabled: boolean, count: number) {
	const title = enabled
		? i18n.baseText('resourceActions.mcpAccess.success.enabled.title')
		: i18n.baseText('resourceActions.mcpAccess.success.disabled.title');
	const message = enabled
		? i18n.baseText('resourceActions.mcpAccess.success.enabled.message', {
				adjustToNumber: count,
				interpolate: {
					count: String(count),
					link: settingsLink.value,
					scopeName: scopeName.value,
				},
			})
		: i18n.baseText('resourceActions.mcpAccess.success.disabled.message', {
				adjustToNumber: count,
				interpolate: {
					count: String(count),
					link: settingsLink.value,
					scopeName: scopeName.value,
				},
			});

	toast.showToast({
		title,
		message,
		onClick: openSettingsFromToast,
		type: 'success',
	});
}

function showMCPAccessErrorToast(enabled: boolean) {
	const title = enabled
		? i18n.baseText('resourceActions.mcpAccess.error.enabled.title')
		: i18n.baseText('resourceActions.mcpAccess.error.disabled.title');
	const message = enabled
		? i18n.baseText('resourceActions.mcpAccess.error.enabled.message', {
				interpolate: { link: settingsLink.value, scopeName: scopeName.value },
			})
		: i18n.baseText('resourceActions.mcpAccess.error.disabled.message', {
				interpolate: { link: settingsLink.value, scopeName: scopeName.value },
			});

	toast.showToast({
		title,
		message,
		onClick: openSettingsFromToast,
		type: 'error',
		duration: 0,
	});
}

async function toggleMcpAccess(enabled: boolean) {
	const target = getTarget();
	if (!target) return;

	try {
		isLoading.value = true;
		const response = await mcpStore.toggleWorkflowsMcpAccess(target, enabled);
		emit('updated');

		if (response.failedCount > 0) {
			showMCPAccessErrorToast(enabled);
			return;
		}

		showMCPAccessSuccessToast(enabled, response.updatedCount);
	} catch {
		showMCPAccessErrorToast(enabled);
	} finally {
		isLoading.value = false;
	}
}

async function onSelect(action: McpAccessAction) {
	await toggleMcpAccess(action === 'enableMcpAccess');
}
</script>

<template>
	<N8nDropdownMenu
		:items="menuItems"
		placement="bottom-end"
		:disabled="isDisabled"
		data-test-id="resource-actions-menu"
		@select="onSelect"
	>
		<template #trigger>
			<N8nButton
				variant="outline"
				size="medium"
				icon-only
				icon="ellipsis"
				:aria-label="i18n.baseText('resourceActions.mcpAccess.button.ariaLabel')"
				data-test-id="resource-actions-menu-button"
				:disabled="isDisabled"
			/>
		</template>
		<template #item-label="{ item, ui }">
			<N8nTooltip
				:content="item.data?.tooltip"
				placement="left"
				:show-after="300"
				:teleported="false"
			>
				<N8nText
					:class="ui.class"
					size="medium"
					:color="item.disabled ? 'text-light' : 'text-dark'"
				>
					{{ item.label }}
				</N8nText>
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>
