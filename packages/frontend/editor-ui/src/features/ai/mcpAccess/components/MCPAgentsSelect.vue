<script setup lang="ts">
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { LOADING_INDICATOR_TIMEOUT } from '@/features/ai/mcpAccess/mcp.constants';
import { N8nSelect, N8nOption, N8nText } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import type { Agent } from '@/features/agents/agent.types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';

defineProps<{
	placeholder?: string;
	disabled?: boolean;
}>();

const i18n = useI18n();
const toast = useToast();

const modelValue = defineModel<string[]>({ default: () => [] });

const emit = defineEmits<{
	ready: [];
	confirm: [];
}>();

const mcpStore = useMCPStore();

const isLoading = ref(false);
const hasFetched = ref(false);
const isDropdownVisible = ref(false);
const selectRef = ref<InstanceType<typeof N8nSelect>>();
const agentOptions = ref<Agent[]>([]);
let loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

const showEmptyState = computed(() => {
	return !isLoading.value && hasFetched.value && agentOptions.value.length === 0;
});

const projectName = (agent: Agent) =>
	agent.project?.type === 'personal'
		? i18n.baseText('projects.menu.personal')
		: (agent.project?.name ?? '');

async function searchAgents(query?: string) {
	if (loadingTimeoutId) {
		clearTimeout(loadingTimeoutId);
		loadingTimeoutId = null;
	}
	isLoading.value = true;
	hasFetched.value = false;
	try {
		const response = await mcpStore.getMcpEligibleAgents({
			take: 10,
			query: query ?? undefined,
		});
		agentOptions.value = response?.data ?? [];
	} catch (e) {
		toast.showError(e, i18n.baseText('settings.mcp.connectAgents.error'));
	} finally {
		await waitFor(LOADING_INDICATOR_TIMEOUT);
		isLoading.value = false;
		hasFetched.value = true;
	}
}

async function waitFor(timeout: number) {
	await new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, timeout);
	});
}

function focusOnInput() {
	selectRef.value?.focusOnInput();
}

function removeOption(value: string) {
	agentOptions.value = agentOptions.value.filter((option) => option.id !== value);
}

function onVisibleChange(visible: boolean) {
	isDropdownVisible.value = visible;
}

function onKeydownCapture(event: KeyboardEvent) {
	if (event.key === 'Enter' && !isDropdownVisible.value && modelValue.value.length > 0) {
		event.preventDefault();
		event.stopPropagation();
		emit('confirm');
	}
}

onMounted(async () => {
	await searchAgents();
	emit('ready');
});

defineExpose({
	focusOnInput,
	removeOption,
});
</script>

<template>
	<div @keydown.enter.capture="onKeydownCapture">
		<N8nSelect
			ref="selectRef"
			v-model="modelValue"
			data-test-id="mcp-agents-select"
			:placeholder="placeholder"
			:disabled="disabled"
			:loading="isLoading"
			:multiple="true"
			:filterable="true"
			:remote="true"
			:remote-method="searchAgents"
			size="medium"
			:popper-class="{
				[$style['mcp-agents-select-loading']]: isLoading,
				[$style['mcp-agents-select-empty']]: showEmptyState,
			}"
			@visible-change="onVisibleChange"
		>
			<N8nOption v-if="showEmptyState" value="" disabled :class="$style['empty-option']">
				{{ i18n.baseText('settings.mcp.connectAgents.emptyState') }}
			</N8nOption>
			<N8nOption v-for="agent in agentOptions" :key="agent.id" :value="agent.id" :label="agent.name">
				<div :class="$style.option">
					<N8nText :class="$style.truncate">{{ projectName(agent) }}</N8nText>
					<span :class="$style.separator">/</span>
					<N8nText :class="$style.truncate" color="text-dark">{{ agent.name }}</N8nText>
				</div>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style module lang="scss">
.mcp-agents-select-loading,
.mcp-agents-select-empty {
	display: flex;
	min-height: var(--spacing--5xl);
	align-items: center;
	justify-content: space-around;
}

.empty-option {
	cursor: default !important;
	color: var(--color--text) !important;
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow: hidden;
}

.separator {
	user-select: none;
	color: var(--color--text--tint-1);
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
