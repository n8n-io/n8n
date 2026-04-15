<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiMessage } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';

const store = useInstanceAiStore();
const i18n = useI18n();
const { getToolLabel } = useToolLabel();

const elapsed = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const ROLE_LABELS: Record<string, string> = {
	'workflow-builder': 'Building workflow',
	'data-table-manager': 'Managing data tables',
};

function deriveActivity(messages: InstanceAiMessage[]): { label: string; detail?: string } | null {
	const lastMsg = [...messages].reverse().find((m) => m.role === 'assistant' && m.isStreaming);
	if (!lastMsg?.agentTree) return { label: i18n.baseText('instanceAi.statusBar.thinking') };

	const tree = lastMsg.agentTree;

	// Check active children first (sub-agents)
	const activeChild = tree.children.find((c) => c.status === 'active');
	if (activeChild) {
		const roleLabel = ROLE_LABELS[activeChild.role] ?? activeChild.role;
		const activeTool = activeChild.toolCalls.find((tc) => tc.isLoading);
		if (activeTool) {
			const toolLabel = getToolLabel(activeTool.toolName, activeTool.args);
			return { label: roleLabel, detail: toolLabel };
		}
		return { label: roleLabel };
	}

	// Check root-level active tools
	const activeTool = tree.toolCalls.find((tc) => tc.isLoading);
	if (activeTool) {
		const toolLabel = getToolLabel(activeTool.toolName, activeTool.args);
		return { label: toolLabel };
	}

	return { label: i18n.baseText('instanceAi.statusBar.thinking') };
}

const activity = computed(() => deriveActivity(store.messages));

const isVisible = computed(() => store.isStreaming);

const formattedElapsed = computed(() => {
	const s = elapsed.value;
	if (s < 60) return `${String(s)}s`;
	const m = Math.floor(s / 60);
	const remaining = s % 60;
	return `${String(m)}m ${String(remaining).padStart(2, '0')}s`;
});

watch(isVisible, (visible) => {
	if (visible) {
		elapsed.value = 0;
		timer = setInterval(() => {
			elapsed.value++;
		}, 1000);
	} else {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}
});

onUnmounted(() => {
	if (timer) {
		clearInterval(timer);
	}
});
</script>

<template>
	<div>
		<Transition name="status-bar">
			<div v-if="isVisible && activity" :class="$style.bar" data-test-id="instance-ai-status-bar">
				<span :class="$style.dot" />
				<span :class="$style.label">{{ activity.label }}</span>
				<span v-if="activity.detail" :class="$style.separator">&middot;</span>
				<span v-if="activity.detail" :class="$style.detail">{{ activity.detail }}</span>
				<span :class="$style.separator">&middot;</span>
				<span :class="$style.elapsed">{{ formattedElapsed }}</span>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" module>
.bar {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--2xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	pointer-events: none;
}

.dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color--primary);
	animation: pulse 1.5s ease-in-out infinite;
	flex-shrink: 0;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.4;
	}
}

.label {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

.separator {
	color: var(--color--text--tint-1);
}

.detail {
	color: var(--color--text--tint-1);
}

.elapsed {
	font-variant-numeric: tabular-nums;
	color: var(--color--text--tint-1);
}
</style>

<style lang="scss">
.status-bar-enter-from,
.status-bar-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.status-bar-enter-active {
	transition: all 0.2s ease-out;
}

.status-bar-leave-active {
	transition: all 0.15s ease-in;
}
</style>
