<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { MCP_CONNECT_WORKFLOWS_MODAL_KEY } from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { N8nButton, N8nIcon, N8nNotice, N8nSelect, N8nOption } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onMounted, ref } from 'vue';

type SelectRef = InstanceType<typeof N8nSelect>;
type SelectOption = { value: string; label: string };

const i18n = useI18n();
const mcpStore = useMCPStore();

const isSaving = ref(false);
const isLoading = ref(false);
const canSave = ref(true);
const selectRef = ref<SelectRef | null>(null);
const workflowOptions = ref<SelectOption[]>([]);

const modalBus = createEventBus();

const noticeText = computed(() => {
	return `
		${i18n.baseText('settings.mcp.connectWorkflows.notice.intro')}:
		<ul>
			<li>${i18n.baseText('settings.mcp.connectWorkflows.notice.condition1')}</li>
			<li>${i18n.baseText('settings.mcp.connectWorkflows.notice.condition2')}</li>
		</ul>
	`;
});

const cancel = () => {
	modalBus.emit('close');
};

function save() {
	isSaving.value = true;
}

async function loadEligibleWorkflows() {
	isLoading.value = true;
	try {
		const response = await mcpStore.getMcpEligibleWorkflows({ take: 10 });
		const workflows = response?.data ?? [];
		workflowOptions.value = workflows.map((workflow) => ({
			value: workflow.id,
			label: workflow.name,
		}));
	} finally {
		isLoading.value = false;
	}
}

onMounted(async () => {
	await loadEligibleWorkflows();
	setTimeout(() => {
		selectRef.value?.focusOnInput();
	}, 150);
});
</script>

<template>
	<Modal
		:name="MCP_CONNECT_WORKFLOWS_MODAL_KEY"
		:title="i18n.baseText('settings.mcp.connectWorkflows')"
		width="600px"
		:class="$style.container"
	>
		<template #content>
			<div :class="$style.content">
				<N8nNotice data-test-id="mcp-connect-workflows-info-notice" :content="noticeText" />
				<N8nSelect
					ref="selectRef"
					data-test-id="mcp-connect-workflows-select"
					:placeholder="i18n.baseText('settings.mcp.connectWorkflows.input.placeholder')"
					:disabled="isSaving"
					:loading="isLoading"
					:filterable="true"
				>
					<template #prepend>
						<N8nIcon :class="$style['search-icon']" icon="search" size="large" color="text-light" />
					</template>
					<N8nOption
						v-for="option in workflowOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					:label="i18n.baseText('generic.cancel')"
					:size="'small'"
					:disabled="isSaving"
					type="tertiary"
					data-test-id="mcp-connect-workflows-cancel-button"
					@click="cancel"
				/>
				<N8nButton
					:label="i18n.baseText('settings.mcp.connectWorkflows.confirm.label')"
					:loading="isSaving"
					:disabled="!canSave || isSaving"
					type="primary"
					data-test-id="mcp-connect-workflows-save-button"
					@click="save"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
}

.content {
	ul {
		margin: var(--spacing--3xs);
	}
}

.search-icon {
	min-width: var(--spacing--lg);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
