<script setup lang="ts">
import { computed } from 'vue';
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
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { ToolConnectionStatus } from '@/features/shared/toolsConnection/types';
import {
	type InputMenuItem,
	useInstanceAiInputMenuItems,
} from '../composables/useInstanceAiInputMenuItems';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ attachFiles: [] }>();
const i18n = useI18n();
const telemetry = useTelemetry();
const { menuItems, disconnectedConnectionCount } = useInstanceAiInputMenuItems(() =>
	emit('attachFiles'),
);

const tooltip = computed(() => {
	const count = disconnectedConnectionCount.value;
	if (count === 0) return i18n.baseText('instanceAi.inputMenu.open');
	if (count === 1) return i18n.baseText('instanceAi.inputMenu.connectionNeedsAttention');
	return i18n.baseText('instanceAi.inputMenu.connectionsNeedAttention', {
		interpolate: { count: String(count) },
	});
});

const STATUS_LABEL_KEYS = {
	connected: 'instanceAi.inputMenu.status.connected',
	connecting: 'instanceAi.inputMenu.status.connecting',
	disconnected: 'instanceAi.inputMenu.status.disconnected',
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

function trackInputPlusButtonClick() {
	telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_CLICKED_AI_ASSISTANT_INPUT_PLUS_BUTTON, {});
}

function handleUpdateDropdownModelValue(open: boolean) {
	if (open) {
		trackInputPlusButtonClick();
	}
}
</script>

<template>
	<N8nTooltip :content="tooltip" :content-class="$style.triggerTooltip" placement="top">
		<N8nDropdownMenu
			:items="menuItems"
			placement="top-start"
			:disabled="props.disabled"
			data-test-id="instance-ai-input-menu"
			@select="handleSelect"
			@update:model-value="handleUpdateDropdownModelValue"
		>
			<template #trigger>
				<span :class="$style.trigger">
					<N8nIconButton
						icon="plus"
						variant="outline"
						size="medium"
						:disabled="props.disabled"
						:aria-label="tooltip"
					/>
					<span
						v-if="disconnectedConnectionCount > 0"
						:class="$style.triggerStatusDot"
						aria-hidden="true"
					/>
				</span>
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
					:class="[ui.class, $style.itemLabel, !item.children?.length && $style.itemLabelLeaf]"
				>
					<span>{{ item.label }}</span>
					<span
						v-if="
							item.data?.status &&
							item.data.status !== 'none' &&
							!(item.id === 'tools' && item.data.status === 'connected')
						"
						:class="$style.statusIndicator"
						:aria-label="i18n.baseText(STATUS_LABEL_KEYS[item.data.status])"
					>
						<N8nSpinner v-if="item.data.status === 'connecting'" size="small" />
						<N8nIcon
							v-else-if="item.data.status === 'connected'"
							icon="check"
							size="small"
							:class="[$style.statusIcon, $style.connected]"
						/>
						<span
							v-else-if="item.id === 'tools'"
							:class="[$style.statusDot, $style.disconnectedDot]"
						/>
						<N8nIcon
							v-else
							icon="circle-x"
							size="small"
							:class="[$style.statusIcon, $style.disconnected]"
						/>
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

.trigger {
	position: relative;
	display: inline-flex;
}

.triggerStatusDot {
	position: absolute;
	top: 2px;
	right: 2px;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background: var(--color--danger);
	box-shadow: 0 0 0 var(--spacing--5xs) var(--background--surface);
	transform: translate(50%, -50%);
	pointer-events: none;
}

.itemLabel {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.itemLabelLeaf {
	padding-right: var(--spacing--xs);
}

.statusDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	flex: 0 0 auto;
	border-radius: 50%;
}

.statusIcon {
	flex: 0 0 auto;
}

.statusIndicator {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	flex: 0 0 var(--spacing--sm);
	margin-left: var(--spacing--sm);
}

.connected {
	color: var(--color--success);
}

.disconnected {
	color: var(--color--danger);
}

.disconnectedDot {
	background: var(--color--danger);
}
</style>
