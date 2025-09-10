<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '@n8n/design-system/composables/useI18n';

import BaseMessage from './BaseMessage.vue';
import type { ChatUI } from '../../../types/assistant';
import N8nIcon from '../../N8nIcon';
import N8nText from '../../N8nText';
import N8nTooltip from '../../N8nTooltip';

export interface Props {
	message: ChatUI.ToolMessage & { id: string; read: boolean };
	isFirstOfRole: boolean;
	showProgressLogs?: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

const props = defineProps<Props>();
const { t } = useI18n();

const toolDisplayName = computed(() => {
	// Convert tool names from snake_case to Title Case
	return (
		props.message.customDisplayTitle ??
		props.message.displayTitle ??
		props.message.toolName
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
	);
});

const statusMessage = computed(() => {
	switch (props.message.status) {
		case 'running':
			return t('assistantChat.builder.toolRunning');
		case 'error':
			return t('assistantChat.builder.toolError');
		default:
			return '';
	}
});

const statusColor = computed(() => {
	switch (props.message.status) {
		case 'completed':
			return 'success';
		case 'error':
			return 'warning';
		default:
			return 'secondary';
	}
});
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.toolMessage">
			<div :class="$style.header">
				<div :class="$style.titleRow">
					<div :class="$style.status">
						<N8nTooltip placement="top" :disabled="!statusMessage">
							<template #content>
								<span :class="$style.statusText">
									{{ statusMessage }}
								</span>
							</template>
							<N8nIcon
								v-if="message.status === 'running'"
								icon="spinner"
								spin
								:color="statusColor"
								size="large"
							/>
							<N8nIcon
								v-else-if="message.status === 'error'"
								icon="triangle-alert"
								:color="statusColor"
								size="large"
							/>
							<N8nIcon v-else icon="circle-check" :color="statusColor" size="large" />
						</N8nTooltip>
					</div>
					<N8nText
						size="small"
						bold
						:color="message.status === 'running' ? 'text-light' : 'text-dark'"
						:class="{ [$style.running]: message.status === 'running' }"
						>{{ toolDisplayName }}</N8nText
					>
				</div>
			</div>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
@use '../../../css/mixins/animations';

.toolMessage {
	width: 100%;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

.running {
	@include animations.shimmer;
}

.statusText {
	font-size: var(--font-size-2xs);

	&.status-running {
		color: var(--execution-card-text-waiting);
	}

	&.status-completed {
		color: var(--color-success);
	}

	&.status-error {
		color: var(--color-text-danger);
	}
}

.content {
	padding: 0 var(--spacing-xs) var(--spacing-xs) var(--spacing-xs);
	border-radius: var(--border-radius-base);
}

.sectionTitle {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	margin-bottom: var(--spacing-3xs);
}

.errorContent {
	color: var(--color-danger);
	font-size: var(--font-size-2xs);
	padding: var(--spacing-xs);
	background-color: var(--color-danger-tint-2);
	border-radius: var(--border-radius-base);
}
</style>
