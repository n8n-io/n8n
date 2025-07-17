<script setup lang="ts">
import { ref, computed } from 'vue';

import { useI18n } from '@n8n/design-system/composables/useI18n';

import BaseMessage from './BaseMessage.vue';
import type { ChatUI } from '../../../types/assistant';
import N8nIcon from '../../N8nIcon';
import N8nTooltip from '../../N8nTooltip';

interface Props {
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

const expanded = ref(false);
const toolDisplayName = computed(() => {
	// Convert tool names from snake_case to Title Case
	return props.message.toolName
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
});

const latestInput = computed(() => {
	const inputUpdate = props.message.updates?.find((u) => u.type === 'input');
	return inputUpdate?.data;
});

const latestOutput = computed(() => {
	const outputUpdate = props.message.updates.find((u) => u.type === 'output');
	return outputUpdate?.data;
});

const latestError = computed(() => {
	const errorUpdate = props.message.updates.find((u) => u.type === 'error');
	return errorUpdate?.data;
});

const progressMessages = computed(() => {
	return (props.message.updates ?? []).filter((u) => u.type === 'progress').map((u) => u.data);
});

const statusMessage = computed(() => {
	switch (props.message.status) {
		case 'running':
			return t('assistantChat.builder.toolRunning');
		case 'completed':
			return t('assistantChat.builder.toolCompleted');
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
			return 'danger';
		default:
			return 'secondary';
	}
});

function formatJSON(data: Record<string, unknown> | string): string {
	if (!data) return '';
	try {
		return JSON.stringify(data, null, 2);
	} catch {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return String(data);
	}
}

function toggleExpanded() {
	expanded.value = !expanded.value;
}
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.toolMessage">
			<div :class="$style.header" @click="toggleExpanded">
				<div :class="$style.titleRow">
					<N8nIcon
						:icon="expanded ? 'chevron-down' : 'chevron-right'"
						size="small"
						:class="$style.expandIcon"
					/>
					<span :class="$style.toolName">{{ toolDisplayName }}</span>
					<div :class="$style.status">
						<N8nTooltip placement="left" :disabled="message.status !== 'running'">
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
							/>
							<N8nIcon
								v-else-if="message.status === 'error'"
								icon="status-error"
								:color="statusColor"
							/>
							<N8nIcon v-else icon="status-completed" :color="statusColor" />
						</N8nTooltip>
					</div>
				</div>
			</div>

			<div v-if="expanded" :class="$style.content">
				<!-- Progress messages -->
				<div v-if="progressMessages.length > 0 && showProgressLogs" :class="$style.section">
					<div :class="$style.sectionTitle">Progress</div>
					<div
						v-for="(progress, index) in progressMessages"
						:key="index"
						:class="$style.progressItem"
					>
						{{ progress }}
					</div>
				</div>

				<!-- Input -->
				<div v-if="latestInput" :class="$style.section">
					<div :class="$style.sectionTitle">Input</div>
					<pre :class="$style.jsonContent">{{ formatJSON(latestInput) }}</pre>
				</div>

				<!-- Output -->
				<div v-if="latestOutput" :class="$style.section">
					<div :class="$style.sectionTitle">Output</div>
					<pre :class="$style.jsonContent">{{ formatJSON(latestOutput) }}</pre>
				</div>

				<!-- Error -->
				<div v-if="latestError" :class="$style.section">
					<div :class="$style.sectionTitle">Error</div>
					<div :class="$style.errorContent">
						{{ latestError.message || latestError }}
					</div>
				</div>
			</div>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.toolMessage {
	width: 100%;
}

.header {
	cursor: pointer;
	padding: var(--spacing-xs);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-light);

	&:hover {
		background-color: var(--color-background-base);
	}
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.expandIcon {
	flex-shrink: 0;
}

.toolName {
	font-weight: var(--font-weight-bold);
	flex: 1;
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

.statusText {
	font-size: var(--font-size-2xs);
	text-transform: capitalize;

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
	margin-top: var(--spacing-xs);
	padding: var(--spacing-xs);
	background-color: var(--color-background-xlight);
	border-radius: var(--border-radius-base);
}

.section {
	margin-bottom: var(--spacing-s);

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionTitle {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	margin-bottom: var(--spacing-3xs);
}

.progressItem {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin-bottom: var(--spacing-3xs);
}

.jsonContent {
	font-family: var(--font-family-monospace);
	font-size: var(--font-size-3xs);
	background-color: var(--color-background-base);
	padding: var(--spacing-xs);
	border-radius: var(--border-radius-base);
	overflow-x: auto;
	margin: 0;
	max-height: 300px;
	overflow-y: auto;

	@supports not (selector(::-webkit-scrollbar)) {
		scrollbar-width: thin;
	}
	@supports selector(::-webkit-scrollbar) {
		&::-webkit-scrollbar {
			width: var(--spacing-2xs);
			height: var(--spacing-2xs);
		}
		&::-webkit-scrollbar-thumb {
			border-radius: var(--spacing-xs);
			background: var(--color-foreground-dark);
			border: var(--spacing-5xs) solid white;
		}
	}
}

.errorContent {
	color: var(--color-danger);
	font-size: var(--font-size-2xs);
	padding: var(--spacing-xs);
	background-color: var(--color-danger-tint-2);
	border-radius: var(--border-radius-base);
}
</style>
