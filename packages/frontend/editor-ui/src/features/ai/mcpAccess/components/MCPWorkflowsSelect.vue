<script setup lang="ts">
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { LOADING_INDICATOR_TIMEOUT } from '@/features/ai/mcpAccess/mcp.constants';
import { N8nIcon, N8nSelect, N8nOption } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import type { WorkflowListItem } from '@/Interface';
import WorkflowLocation from '@/features/ai/mcpAccess/components/WorkflowLocation.vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';

defineProps<{
	placeholder?: string;
	disabled?: boolean;
}>();

const i18n = useI18n();
const toast = useToast();

const modelValue = defineModel<string>();

const emit = defineEmits<{
	ready: [];
	confirm: [];
}>();

const mcpStore = useMCPStore();

const isLoading = ref(false);
const hasFetched = ref(false);
const isDropdownVisible = ref(false);
const selectRef = ref<InstanceType<typeof N8nSelect>>();
const workflowOptions = ref<WorkflowListItem[]>([]);
let loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

const showEmptyState = computed(() => {
	return !isLoading.value && hasFetched.value && workflowOptions.value.length === 0;
});

async function searchWorkflows(query?: string) {
	if (loadingTimeoutId) {
		clearTimeout(loadingTimeoutId);
		loadingTimeoutId = null;
	}
	isLoading.value = true;
	hasFetched.value = false;
	try {
		const response = await mcpStore.getMcpEligibleWorkflows({
			take: 10,
			query: query ?? undefined,
		});
		workflowOptions.value = response?.data ?? [];
	} catch (e) {
		toast.showError(e, i18n.baseText('settings.mcp.connectWorkflows.error'));
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
	workflowOptions.value = workflowOptions.value.filter((option) => option.id !== value);
}

function onVisibleChange(visible: boolean) {
	isDropdownVisible.value = visible;
}

function onKeydownCapture(event: KeyboardEvent) {
	if (event.key === 'Enter' && !isDropdownVisible.value && modelValue.value) {
		event.preventDefault();
		event.stopPropagation();
		emit('confirm');
	}
}

onMounted(async () => {
	await searchWorkflows();
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
			data-test-id="mcp-workflows-select"
			:placeholder="placeholder"
			:disabled="disabled"
			:loading="isLoading"
			:filterable="true"
			:remote="true"
			:remote-method="searchWorkflows"
			:popper-class="{
				[$style['mcp-workflows-select-loading']]: isLoading,
				[$style['mcp-workflows-select-empty']]: showEmptyState,
			}"
			@visible-change="onVisibleChange"
		>
			<template #prefix>
				<N8nIcon :class="$style['search-icon']" icon="search" size="large" />
			</template>
			<N8nOption v-if="showEmptyState" value="" disabled :class="$style['empty-option']">
				{{ i18n.baseText('settings.mcp.connectWorkflows.emptyState') }}
			</N8nOption>
			<N8nOption
				v-for="workflow in workflowOptions"
				:key="workflow.id"
				:value="workflow.id"
				:label="workflow.name"
			>
				<WorkflowLocation
					:workflow-id="workflow.id"
					:workflow-name="workflow.name"
					:home-project="workflow.homeProject"
					:parent-folder="workflow.parentFolder"
				/>
			</N8nOption>
		</N8nSelect>
	</div>
</template>

<style module lang="scss">
.mcp-workflows-select-loading,
.mcp-workflows-select-empty {
	display: flex;
	min-height: var(--spacing--5xl);
	align-items: center;
	justify-content: space-around;
}

.empty-option {
	cursor: default !important;
	color: var(--color--text) !important;
}
</style>
