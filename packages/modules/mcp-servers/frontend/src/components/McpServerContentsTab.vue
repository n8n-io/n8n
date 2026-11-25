<script setup lang="ts">
import type {
	McpServerDetailResponse,
	McpServerToolCandidate,
	McpServerToolResponse,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nLoading, N8nText } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, h, onMounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
	addWorkflowTools,
	getMcpServer,
	listToolCandidates,
	removeTool,
	updateTool,
} from '../mcp-servers.api';
import { getMcpServerPermissions } from '../mcp-servers.permissions';
import McpServerToolRow from './McpServerToolRow.vue';
import McpWorkflowPickerDialog from './McpWorkflowPickerDialog.vue';

const props = defineProps<{
	projectId: string;
	serverId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const style = useCssModule();

const server = ref<McpServerDetailResponse | null>(null);
const loading = ref(true);
const pickerOpen = ref(false);
const candidates = ref<McpServerToolCandidate[]>([]);
const candidatesLoading = ref(false);

const canUpdate = computed(() => getMcpServerPermissions(props.projectId).canUpdate);
const workflowTools = computed(
	() => server.value?.tools.filter((tool) => tool.kind === 'workflow') ?? [],
);
/** `?expand=<tool name>` opens that tool row, for a deep link. */
const expandName = computed(() =>
	typeof route?.query.expand === 'string' ? route.query.expand : '',
);

function workflowHref(workflowId: string) {
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId } }).href;
}

function replaceTool(updated: McpServerToolResponse) {
	if (!server.value) return;
	server.value.tools = server.value.tools.map((tool) => (tool.id === updated.id ? updated : tool));
}

async function load() {
	loading.value = true;
	try {
		server.value = await getMcpServer(rootStore.restApiContext, props.projectId, props.serverId);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.tools.loadError'));
	} finally {
		loading.value = false;
	}
}

async function openPicker() {
	pickerOpen.value = true;
	candidatesLoading.value = true;
	try {
		candidates.value = await listToolCandidates(
			rootStore.restApiContext,
			props.projectId,
			props.serverId,
		);
	} catch (error) {
		pickerOpen.value = false;
		toast.showError(error, i18n.baseText('mcpServers.picker.loadError'));
	} finally {
		candidatesLoading.value = false;
	}
}

async function onAdd(workflowIds: string[]) {
	try {
		const added = await addWorkflowTools(
			rootStore.restApiContext,
			props.projectId,
			props.serverId,
			workflowIds,
		);
		if (server.value) server.value.tools = [...server.value.tools, ...added];
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.tools.addError'));
	}
}

async function onUpdate(tool: McpServerToolResponse, changes: UpdateMcpServerToolDto) {
	try {
		replaceTool(
			await updateTool(rootStore.restApiContext, props.projectId, props.serverId, tool.id, changes),
		);
	} catch (error) {
		// A new object resets the fields of the row to the saved text.
		replaceTool({ ...tool });
		toast.showError(error, i18n.baseText('mcpServers.tools.saveError'));
	}
}

async function onRemove(tool: McpServerToolResponse) {
	try {
		await removeTool(rootStore.restApiContext, props.projectId, props.serverId, tool.id);
		if (server.value) server.value.tools = server.value.tools.filter(({ id }) => id !== tool.id);
		// The toast title capitalizes its first letter, so the exact tool name goes in the message.
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mcpServers.tools.removed'),
			message: h('span', { class: style.toastToolName }, tool.toolName),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.tools.removeError'));
	}
}

onMounted(load);
</script>

<template>
	<div :class="$style.contents" data-test-id="mcp-server-contents">
		<N8nLoading v-if="loading" :rows="3" />
		<template v-else-if="server">
			<div
				v-if="server.tools.length === 0"
				:class="$style.emptyBox"
				data-test-id="mcp-server-empty-contents"
			>
				<N8nText color="text-light" align="center">
					{{ i18n.baseText('mcpServers.tools.empty.description') }}
				</N8nText>
				<N8nButton
					v-if="canUpdate"
					variant="outline"
					icon="plus"
					:label="i18n.baseText('mcpServers.tools.addWorkflow')"
					data-test-id="mcp-server-add-workflow"
					data-attr="mcp-server-add-workflow"
					@click="openPicker"
				/>
			</div>

			<section v-else :class="$style.section" data-test-id="mcp-server-section-workflows">
				<div :class="$style.header">
					<div :class="$style.title">
						<N8nText tag="h3" bold>{{
							i18n.baseText('mcpServers.tools.section.workflows')
						}}</N8nText>
						<N8nText color="text-light" data-test-id="mcp-server-tools-count">
							{{ workflowTools.length }}
						</N8nText>
					</div>
					<N8nButton
						v-if="canUpdate"
						variant="outline"
						size="small"
						icon="plus"
						:label="i18n.baseText('mcpServers.tools.addWorkflow')"
						data-test-id="mcp-server-add-workflow"
						data-attr="mcp-server-add-workflow"
						@click="openPicker"
					/>
				</div>
				<div v-if="workflowTools.length" :class="$style.list">
					<McpServerToolRow
						v-for="tool in workflowTools"
						:key="tool.id"
						:tool="tool"
						:can-update="canUpdate"
						:workflow-href="tool.targetId ? workflowHref(tool.targetId) : null"
						:initially-expanded="!!expandName && tool.toolName === expandName"
						@update="onUpdate(tool, $event)"
						@remove="onRemove(tool)"
					/>
				</div>
				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('mcpServers.tools.empty.workflows') }}
				</N8nText>
			</section>

			<McpWorkflowPickerDialog
				v-model:open="pickerOpen"
				:candidates="candidates"
				:loading="candidatesLoading"
				:workflow-href="workflowHref"
				@confirm="onAdd"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.contents {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding-top: var(--spacing--xs);
}

.emptyBox {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--2xl) var(--spacing--lg);
	border: calc(var(--border-width) * 2) dashed var(--border-color);
	border-radius: var(--radius--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toastToolName {
	font-family: var(--font-family--monospace);
	overflow-wrap: anywhere;
}
</style>
