<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nActionDropdown,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types/action-dropdown';
import type { ChatMemorySizeResult } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';

type ClearAction = 'all' | '1' | '24' | '168' | '720' | '2160';

const props = defineProps<{
	usage: ChatMemorySizeResult | null;
	maxSizeBytes: number;
	loading: boolean;
	disabled: boolean;
}>();

const emit = defineEmits<{
	clear: [olderThanHours: number | undefined];
}>();

const i18n = useI18n();
const message = useMessage();

const usedMB = computed(() => Math.round((props.usage?.totalBytes ?? 0) / (1024 * 1024)));
const maxMB = computed(() => Math.round(props.maxSizeBytes / (1024 * 1024)));
const usagePercent = computed(() => {
	if (!props.usage || props.maxSizeBytes === 0) return 0;
	return Math.min(100, Math.round((props.usage.totalBytes / props.maxSizeBytes) * 100));
});

const barColorVar = computed(() => {
	const status = props.usage?.quotaStatus ?? 'ok';
	switch (status) {
		case 'error':
			return 'var(--color--danger)';
		case 'warn':
			return 'var(--color--warning)';
		default:
			return 'var(--color--success)';
	}
});

const clearActionLabels: Record<Exclude<ClearAction, 'all'>, BaseTextKey> = {
	'1': 'settings.chatHub.memoryUsage.olderThan.1h',
	'24': 'settings.chatHub.memoryUsage.olderThan.1d',
	'168': 'settings.chatHub.memoryUsage.olderThan.7d',
	'720': 'settings.chatHub.memoryUsage.olderThan.30d',
	'2160': 'settings.chatHub.memoryUsage.olderThan.90d',
};

const dropdownItems = computed<Array<ActionDropdownItem<ClearAction>>>(() => [
	{ id: 'all', label: i18n.baseText('settings.chatHub.memoryUsage.clearAll') },
	{ id: '1', label: i18n.baseText('settings.chatHub.memoryUsage.olderThan.1h'), divided: true },
	{ id: '24', label: i18n.baseText('settings.chatHub.memoryUsage.olderThan.1d') },
	{ id: '168', label: i18n.baseText('settings.chatHub.memoryUsage.olderThan.7d') },
	{ id: '720', label: i18n.baseText('settings.chatHub.memoryUsage.olderThan.30d') },
	{ id: '2160', label: i18n.baseText('settings.chatHub.memoryUsage.olderThan.90d') },
]);

async function handleClearAction(action: ClearAction) {
	let confirmed: string;

	if (action === 'all') {
		confirmed = await message.confirm(
			i18n.baseText('settings.chatHub.memoryUsage.confirmClearAll.message'),
			i18n.baseText('settings.chatHub.memoryUsage.confirmClearAll.title'),
			{
				confirmButtonText: i18n.baseText('settings.chatHub.memoryUsage.confirmClearAll.confirm'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
	} else {
		const label = i18n.baseText(clearActionLabels[action]).toLowerCase();
		confirmed = await message.confirm(
			i18n.baseText('settings.chatHub.memoryUsage.confirmOlderThan.message', {
				interpolate: { label },
			}),
			i18n.baseText('settings.chatHub.memoryUsage.confirmOlderThan.title'),
			{
				confirmButtonText: i18n.baseText('settings.chatHub.memoryUsage.confirmOlderThan.confirm'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
	}

	if (confirmed !== MODAL_CONFIRM) return;

	const olderThanHours = action === 'all' ? undefined : Number(action);
	emit('clear', olderThanHours);
}
</script>

<template>
	<div :class="$style.container" data-testid="chat-memory-usage-bar">
		<div :class="$style.titleRow">
			<N8nHeading size="small">
				{{ i18n.baseText('settings.chatHub.memoryUsage.title') }}
			</N8nHeading>
			<N8nTooltip placement="top">
				<template #content>
					{{ i18n.baseText('settings.chatHub.memoryUsage.tooltip') }}
				</template>
				<N8nIcon icon="info-circle" :class="$style.infoIcon" size="small" />
			</N8nTooltip>
			<div :class="$style.spacer" />
			<N8nActionDropdown
				v-if="!disabled && usage"
				:items="dropdownItems"
				placement="bottom-end"
				data-testid="chat-memory-clear-dropdown"
				@select="handleClearAction"
			>
				<template #activator>
					<N8nIconButton
						variant="ghost"
						icon="ellipsis-vertical"
						size="small"
						:title="i18n.baseText('settings.chatHub.memoryUsage.clearAll')"
					/>
				</template>
			</N8nActionDropdown>
		</div>
		<div v-if="!loading && usage" :class="$style.barContainer">
			<div :class="$style.barTrack">
				<div
					:class="$style.barFill"
					:style="{ width: `${usagePercent}%`, backgroundColor: barColorVar }"
				/>
			</div>
			<N8nText size="small" :class="$style.label">
				{{
					i18n.baseText('settings.chatHub.memoryUsage.label', {
						interpolate: { used: String(usedMB), max: String(maxMB) },
					})
				}}
			</N8nText>
		</div>
		<div v-else-if="loading" :class="$style.barContainer">
			<div :class="[$style.barTrack, $style.barLoading]" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--4xs);
}

.spacer {
	flex: 1;
}

.infoIcon {
	color: var(--color--text--tint-2);
}

.barContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.barTrack {
	width: 100%;
	height: 8px;
	background-color: var(--color--foreground);
	border-radius: var(--radius);
	overflow: hidden;
}

.barFill {
	height: 100%;
	border-radius: var(--radius);
	transition: width 0.3s ease;
}

.barLoading {
	background: linear-gradient(
		90deg,
		var(--color--foreground) 25%,
		var(--color--foreground--tint-1) 50%,
		var(--color--foreground) 75%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.label {
	color: var(--color--text--tint-1);
}
</style>
