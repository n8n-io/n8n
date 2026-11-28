<script setup lang="ts">
import type {
	McpServerDetailResponse,
	McpServerResponse,
	McpServerToolCandidate,
	McpServerToolDraftField,
	McpServerToolResponse,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, h, onMounted, ref, useCssModule, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
	addWorkflowTools,
	draftTool,
	getMcpServer,
	listToolCandidates,
	removeTool,
	updateMcpServer,
	updateTool,
} from '../mcp-servers.api';
import { getMcpServerPermissions } from '../mcp-servers.permissions';
import {
	orderCapabilityRows,
	VISIBLE_CAPABILITY_ROWS,
	type CapabilityRowKind,
} from './capabilities';
import McpServerChipRow from './McpServerChipRow.vue';
import McpServerDescriptionPanel from './McpServerDescriptionPanel.vue';
import McpServerPanel from './McpServerPanel.vue';
import McpServerToolChip from './McpServerToolChip.vue';
import McpServerToolDialog from './McpServerToolDialog.vue';
import McpWorkflowPickerDialog from './McpWorkflowPickerDialog.vue';

/** The drafts after an add run at most this many at a time, so a save does not wait behind them. */
const DRAFT_CONCURRENCY = 4;

const props = defineProps<{
	projectId: string;
	serverId: string;
	/** The instance has the n8n Assistant, so an empty server offers to build with it. */
	assistantAvailable?: boolean;
	/** The Assistant panel is open beside the page. */
	assistantOpen?: boolean;
	/** A new value loads the server again, after the Assistant changed it. */
	refreshKey?: number;
}>();

const emit = defineEmits<{
	'build-with-assistant': [];
	'server-updated': [server: McpServerResponse];
}>();

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
/** The first load and each reload: only the newest response sets the server. */
const latestFetch = useLatestFetch();
/** Rapid description edits: only the newest PATCH updates the server or reverts on error. */
const latestDescriptionSave = useLatestFetch();
const style = useCssModule();

const server = ref<McpServerDetailResponse | null>(null);
const loading = ref(true);
const descriptionRevision = ref(0);
const pickerOpen = ref(false);
const candidates = ref<McpServerToolCandidate[]>([]);
const candidatesLoading = ref(false);
const selectedToolId = ref<string | null>(null);
/** Tracks the last `?expand=` value already opened so closing the modal does not reopen it. */
const handledExpand = ref('');
/** Tools that wait for their first draft, after the add. */
const draftingIds = ref(new Set<string>());
/** The tools that the latest reload added. Their chips show a short highlight. */
const highlightedIds = ref(new Set<string>());
/** The fields of each tool for which a "Generate" call runs. */
const generating = ref(new Map<string, Set<McpServerToolDraftField>>());
/** The tool whose remove request is currently in flight. */
const removingToolId = ref<string | null>(null);

const canUpdate = computed(() => getMcpServerPermissions(props.projectId).canUpdate);
const canBuildWithAssistant = computed(() => canUpdate.value && !!props.assistantAvailable);
const canGenerate = computed(() => canUpdate.value && !!server.value?.toolDraftsAvailable);
const workflowTools = computed(
	() => server.value?.tools.filter((tool) => tool.kind === 'workflow') ?? [],
);
const orderedCapabilityRows = computed<CapabilityRowKind[]>(() =>
	orderCapabilityRows(VISIBLE_CAPABILITY_ROWS, {
		workflows: workflowTools.value.length,
	}),
);
const selectedTool = computed(
	() => workflowTools.value.find(({ id }) => id === selectedToolId.value) ?? null,
);
/** `?expand=<tool name>` opens that tool in the modal, for old deep links. */
const expandName = computed(() =>
	typeof route?.query.expand === 'string' ? route.query.expand : '',
);

watch(
	[workflowTools, expandName],
	([tools, target]) => {
		if (!target) {
			handledExpand.value = '';
			return;
		}
		if (handledExpand.value === target) return;
		const match = tools.find(({ toolName }) => toolName === target);
		if (!match) return;
		handledExpand.value = target;
		selectedToolId.value = match.id;
	},
	{ immediate: true },
);

function workflowHref(workflowId: string) {
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId } }).href;
}

function toolWarningReasons(tool: McpServerToolResponse): string[] {
	const reasons: string[] = [];
	if (tool.brokenReason) {
		reasons.push(i18n.baseText(`mcpServers.tools.broken.callout.${tool.brokenReason}`));
	}
	if (!draftingIds.value.has(tool.id) && tool.description.trim() === '') {
		reasons.push(i18n.baseText('mcpServers.tools.row.missingDescription'));
	}
	return reasons;
}

function replaceTool(updated: McpServerToolResponse) {
	if (!server.value) return;
	server.value.tools = server.value.tools.map((tool) => (tool.id === updated.id ? updated : tool));
}

/** A "Generate" answer changes only its field, so a save that ran meanwhile keeps its text. */
function mergeDraftedField(drafted: McpServerToolResponse, field: McpServerToolDraftField) {
	const current = server.value?.tools.find(({ id }) => id === drafted.id);
	if (!current) return;
	replaceTool({
		...current,
		[field]: drafted[field],
		draftSource: drafted.draftSource,
		updatedAt: drafted.updatedAt,
	});
}

async function load() {
	const isLatest = latestFetch.next();
	loading.value = true;
	try {
		const response = await getMcpServer(rootStore.restApiContext, props.projectId, props.serverId);
		if (!isLatest()) return;
		server.value = response;
	} catch (error) {
		if (!isLatest()) return;
		toast.showError(error, i18n.baseText('mcpServers.tools.loadError'));
	} finally {
		if (isLatest()) loading.value = false;
	}
}

/** Loads the server again with no loading state, so the panels stay in place. */
async function reload() {
	const isLatest = latestFetch.next();
	try {
		const next = await getMcpServer(rootStore.restApiContext, props.projectId, props.serverId);
		if (!isLatest()) return;
		// Without a list to compare with, as during the first load, no chip is new.
		const known = server.value ? new Set(server.value.tools.map(({ id }) => id)) : undefined;
		highlightedIds.value = new Set(
			known ? next.tools.filter(({ id }) => !known.has(id)).map(({ id }) => id) : [],
		);
		// A tool that did not change keeps its object, so an open modal does not reset its fields.
		const previous = new Map(server.value?.tools.map((tool) => [tool.id, tool]));
		next.tools = next.tools.map((tool) => {
			const old = previous.get(tool.id);
			return old && old.updatedAt === tool.updatedAt && old.brokenReason === tool.brokenReason
				? old
				: tool;
		});
		server.value = next;
	} catch (error) {
		if (!isLatest()) return;
		toast.showError(error, i18n.baseText('mcpServers.tools.loadError'));
	} finally {
		// A reload can replace the first load, which then leaves the loading state to it.
		if (isLatest()) loading.value = false;
	}
}

watch(
	() => props.refreshKey,
	async () => await reload(),
);

async function onDescription(description: string) {
	const current = server.value;
	if (!current) return;
	const isLatest = latestDescriptionSave.next();
	try {
		const updated = await updateMcpServer(
			rootStore.restApiContext,
			props.projectId,
			props.serverId,
			{ description },
		);
		if (!isLatest()) return;
		if (server.value && updated.id === server.value.id) {
			server.value = {
				...server.value,
				description: updated.description,
				updatedAt: updated.updatedAt,
			};
		}
		emit('server-updated', updated);
	} catch (error) {
		if (!isLatest()) return;
		descriptionRevision.value++;
		toast.showError(error, i18n.baseText('mcpServers.server.description.error'));
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
		// The add returns at once. The new tools get their drafts in the background.
		if (server.value?.toolDraftsAvailable) void draftNewTools(added);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.tools.addError'));
	}
}

/** `not_available` gives the tool with its default text, so the chip shows it in both cases. */
async function requestDraft(tool: McpServerToolResponse, field?: McpServerToolDraftField) {
	const { tool: drafted } = await draftTool(
		rootStore.restApiContext,
		props.projectId,
		props.serverId,
		tool.id,
		field,
	);
	if (field) mergeDraftedField(drafted, field);
	else replaceTool(drafted);
}

/**
 * Every new chip shows a spinner at once. A small pool of workers takes the tools from a
 * queue. The failed drafts of one add give one toast.
 */
async function draftNewTools(tools: McpServerToolResponse[]) {
	draftingIds.value = new Set([...draftingIds.value, ...tools.map(({ id }) => id)]);
	const queue = [...tools];
	let failed = 0;
	let lastError: unknown;
	async function worker() {
		for (let tool = queue.shift(); tool; tool = queue.shift()) {
			try {
				await requestDraft(tool);
			} catch (error) {
				failed++;
				lastError = error;
			}
			const next = new Set(draftingIds.value);
			next.delete(tool.id);
			draftingIds.value = next;
		}
	}
	await Promise.all(Array.from({ length: Math.min(DRAFT_CONCURRENCY, tools.length) }, worker));
	if (failed === 0) return;
	toast.showError(
		lastError,
		failed === 1
			? i18n.baseText('mcpServers.tools.draftError')
			: i18n.baseText('mcpServers.tools.draftErrors', {
					adjustToNumber: failed,
					interpolate: { count: failed },
				}),
	);
}

function generatingFields(toolId: string): McpServerToolDraftField[] {
	return [...(generating.value.get(toolId) ?? [])];
}

function setGenerating(toolId: string, fields: Set<McpServerToolDraftField>) {
	const next = new Map(generating.value);
	if (fields.size > 0) next.set(toolId, fields);
	else next.delete(toolId);
	generating.value = next;
}

async function onGenerate(tool: McpServerToolResponse, field: McpServerToolDraftField) {
	const running = generating.value.get(tool.id) ?? new Set();
	if (running.has(field)) return;
	setGenerating(tool.id, new Set(running).add(field));
	try {
		await requestDraft(tool, field);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.tools.draftError'));
	}
	const after = new Set(generating.value.get(tool.id));
	after.delete(field);
	setGenerating(tool.id, after);
}

async function onUpdate(tool: McpServerToolResponse, changes: UpdateMcpServerToolDto) {
	try {
		replaceTool(
			await updateTool(rootStore.restApiContext, props.projectId, props.serverId, tool.id, changes),
		);
	} catch (error) {
		// A new object resets the field to the saved text. The current tool keeps the result of
		// another save that ended while this one ran.
		const current = server.value?.tools.find(({ id }) => id === tool.id) ?? tool;
		replaceTool({ ...current });
		toast.showError(error, i18n.baseText('mcpServers.tools.saveError'));
	}
}

async function onRemove(tool: McpServerToolResponse) {
	if (removingToolId.value === tool.id) return;
	removingToolId.value = tool.id;
	try {
		await removeTool(rootStore.restApiContext, props.projectId, props.serverId, tool.id);
		if (server.value) server.value.tools = server.value.tools.filter(({ id }) => id !== tool.id);
		if (selectedToolId.value === tool.id) selectedToolId.value = null;
		// The toast title capitalizes its first letter, so the exact tool name goes in the message.
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mcpServers.tools.removed'),
			message: h('span', { class: style.toastToolName }, tool.toolName),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.tools.removeError'));
	} finally {
		if (removingToolId.value === tool.id) removingToolId.value = null;
	}
}

onMounted(load);
</script>

<template>
	<div :class="$style.contents" data-test-id="mcp-server-contents">
		<N8nLoading v-if="loading" :rows="3" />
		<template v-else-if="server">
			<McpServerDescriptionPanel
				:model-value="server.description"
				:can-update="canUpdate"
				:revision="descriptionRevision"
				@update:model-value="onDescription"
			/>

			<McpServerPanel
				:header="i18n.baseText('mcpServers.server.capabilities.title')"
				:description="i18n.baseText('mcpServers.server.capabilities.hint')"
				data-test-id="mcp-server-capabilities-panel"
			>
				<div :class="$style.rows" data-test-id="mcp-server-capabilities-rows">
					<template v-for="row in orderedCapabilityRows" :key="row">
						<template v-if="row === 'workflows'">
							<McpServerChipRow
								v-if="workflowTools.length > 0 || canUpdate"
								:label="i18n.baseText('mcpServers.tools.section.workflows')"
								:item-count="workflowTools.length"
								:add-label="i18n.baseText('mcpServers.tools.addWorkflow')"
								add-button-test-id="mcp-server-add-workflow"
								add-button-attr="mcp-server-add-workflow"
								:hide-add="!canUpdate"
								data-test-id="mcp-server-row-workflows"
								@add="openPicker"
							>
								<McpServerToolChip
									v-for="tool in workflowTools"
									:key="tool.id"
									:tool="tool"
									:drafting="draftingIds.has(tool.id)"
									:highlighted="highlightedIds.has(tool.id)"
									:warning-reasons="toolWarningReasons(tool)"
									@click="selectedToolId = tool.id"
								/>
							</McpServerChipRow>
							<N8nText
								v-else
								size="small"
								color="text-light"
								data-test-id="mcp-server-empty-workflows"
							>
								{{ i18n.baseText('mcpServers.tools.empty.workflows') }}
							</N8nText>
						</template>
					</template>
				</div>

				<div
					v-if="server.tools.length === 0 && canBuildWithAssistant"
					:class="$style.assistantCard"
					data-test-id="mcp-server-build-with-assistant"
				>
					<div :class="$style.assistantCopy">
						<N8nHeading tag="h4" size="small" bold>
							{{ i18n.baseText('mcpServers.assistant.build.title') }}
						</N8nHeading>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.assistant.build.description') }}
						</N8nText>
					</div>
					<N8nButton
						variant="brand"
						size="small"
						icon="n8n-assistant"
						:label="i18n.baseText('mcpServers.assistant.build.button')"
						:disabled="assistantOpen"
						data-test-id="mcp-server-build-with-assistant-button"
						data-attr="mcp-server-build-with-assistant"
						@click="emit('build-with-assistant')"
					/>
				</div>
			</McpServerPanel>

			<McpServerToolDialog
				:tool="selectedTool"
				:can-update="canUpdate"
				:can-generate="canGenerate"
				:drafting="selectedTool ? draftingIds.has(selectedTool.id) : false"
				:removing="selectedTool ? removingToolId === selectedTool.id : false"
				:generating="selectedTool ? generatingFields(selectedTool.id) : []"
				:workflow-href="selectedTool?.targetId ? workflowHref(selectedTool.targetId) : null"
				@close="selectedToolId = null"
				@update="selectedTool && onUpdate(selectedTool, $event)"
				@remove="selectedTool && onRemove(selectedTool)"
				@generate="selectedTool && onGenerate(selectedTool, $event)"
			/>

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
	flex: 0 0 auto;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	padding-bottom: var(--spacing--2xl);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.assistantCard {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
}

.assistantCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.toastToolName {
	font-family: var(--font-family--monospace);
	overflow-wrap: anywhere;
}
</style>
