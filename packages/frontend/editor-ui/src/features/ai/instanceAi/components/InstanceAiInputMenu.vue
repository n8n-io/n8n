<script setup lang="ts">
import {
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nNodeIcon,
	N8nSpinner,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { ToolConnectionStatus } from '@/features/shared/toolsConnection/types';
import {
	type InputMenuItem,
	useInstanceAiInputMenuItems,
} from '../composables/useInstanceAiInputMenuItems';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ attachFiles: [] }>();
const i18n = useI18n();
const menuItems = useInstanceAiInputMenuItems(() => emit('attachFiles'));

const STATUS_LABEL_KEYS = {
	connected: 'instanceAi.connections.row.status.connected',
	connecting: 'instanceAi.connections.row.status.connecting',
	disconnected: 'instanceAi.connections.row.status.disconnected',
} satisfies Record<Exclude<ToolConnectionStatus, 'none'>, BaseTextKey>;

function findMenuItem(items: InputMenuItem[], id: string): InputMenuItem | undefined {
	for (const item of items) {
		if (item.id === id) return item;
		const child = item.children ? findMenuItem(item.children, id) : undefined;
		if (child) return child;
	}
	return undefined;
}

async function handleSelect(id: string) {
	await findMenuItem(menuItems.value, id)?.data?.action?.();
}
</script>

<template>
	<N8nTooltip
		:content="i18n.baseText('instanceAi.inputMenu.open')"
		:content-class="$style.triggerTooltip"
		placement="top"
	>
		<N8nDropdownMenu
			:items="menuItems"
			placement="top-start"
			:disabled="props.disabled"
			data-test-id="instance-ai-input-menu"
			@select="handleSelect"
		>
			<template #trigger>
				<N8nIconButton
					icon="plus"
					variant="outline"
					size="medium"
					:disabled="props.disabled"
					:aria-label="i18n.baseText('instanceAi.inputMenu.open')"
				/>
			</template>

			<template #item-leading="{ item, ui }">
				<N8nNodeIcon
					v-if="item.data?.toolIcon"
					:type="item.data.toolIcon.type"
					:src="item.data.toolIcon.type === 'file' ? item.data.toolIcon.src : undefined"
					:name="item.data.toolIcon.type === 'icon' ? item.data.toolIcon.name : undefined"
					:size="16"
					:class="ui.class"
				/>
				<N8nIcon
					v-else-if="item.icon?.type === 'icon'"
					:icon="item.icon.value"
					size="large"
					:class="ui.class"
				/>
			</template>

			<template #item-label="{ item, ui }">
				<N8nText
					size="medium"
					:color="item.disabled ? 'text-xlight' : 'text-dark'"
					:class="[ui.class, $style.itemLabel]"
				>
					<span>{{ item.label }}</span>
					<span
						v-if="item.data?.status && item.data.status !== 'none'"
						:class="$style.statusIndicator"
						:aria-label="i18n.baseText(STATUS_LABEL_KEYS[item.data.status])"
					>
						<N8nSpinner v-if="item.data.status === 'connecting'" size="small" />
						<span v-else :class="[$style.statusDot, $style[item.data.status]]" />
					</span>
				</N8nText>
			</template>
		</N8nDropdownMenu>
	</N8nTooltip>
</template>

<style lang="scss" module>
.triggerTooltip {
	max-width: none;
	white-space: nowrap;
}

.itemLabel {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.statusDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	flex: 0 0 auto;
	border-radius: 50%;
}

.statusIndicator {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	flex: 0 0 var(--spacing--sm);
	margin-left: var(--spacing--sm);
}

.connected {
	background: var(--color--success);
}

.disconnected {
	background: var(--color--danger);
}
</style>
