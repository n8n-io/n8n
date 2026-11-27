<script setup lang="ts">
import type {
	McpServerDetailResponse,
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
	updateTool,
} from '../mcp-servers.api';
import { getMcpServerPermissions } from '../mcp-servers.permissions';
import McpServerToolRow from './McpServerToolRow.vue';
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
	/** A new value loads the tools again, after the Assistant changed the server. */
	refreshKey?: number;
}>();

const emit = defineEmits<{
	'build-with-assistant': [];
}>();

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
/** The first load and each reload: only the newest response sets the tools. */
const latestFetch = useLatestFetch();
const style = useCssModule();

const server = ref<McpServerDetailResponse | null>(null);
const loading = ref(true);
const pickerOpen = ref(false);
const candidates = ref<McpServerToolCandidate[]>([]);
const candidatesLoading = ref(false);
/** Tools that wait for their first draft, after the add. */
const draftingIds = ref(new Set<string>());
/** The tools that the latest reload added. Their rows show a short highlight. */
const highlightedIds = ref(new Set<string>());
/** The fields of each tool for which a "Generate" call runs. */
const generating = ref(new Map<string, Set<McpServerToolDraftField>>());

const canUpdate = computed(() => getMcpServerPermissions(props.projectId).canUpdate);
const canBuildWithAssistant = computed(() => canUpdate.value && !!props.assistantAvailable);
const canGenerate = computed(() => canUpdate.value && !!server.value?.toolDraftsAvailable);
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

/** Loads the tools again with no loading state, so the rows of the page stay in place. */
async function reload() {
	const isLatest = latestFetch.next();
	try {
		const next = await getMcpServer(rootStore.restApiContext, props.projectId, props.serverId);
		if (!isLatest()) return;
		// Without a list to compare with, as during the first load, no row is new.
		const known = server.value ? new Set(server.value.tools.map(({ id }) => id)) : undefined;
		highlightedIds.value = new Set(
			known ? next.tools.filter(({ id }) => !known.has(id)).map(({ id }) => id) : [],
		);
		// A tool that did not change keeps its object, so its row does not see a new tool.
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

/** `not_available` gives the tool with its default text, so the row shows it in both cases. */
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
 * Every new row shows the loading line at once. A small pool of workers takes the tools from a
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
				<template v-if="canBuildWithAssistant">
					<div :class="$style.assistant" data-test-id="mcp-server-build-with-assistant">
						<N8nHeading tag="h3" size="medium" bold>
							{{ i18n.baseText('mcpServers.assistant.build.title') }}
						</N8nHeading>
						<N8nText color="text-light" align="center">
							{{ i18n.baseText('mcpServers.assistant.build.description') }}
						</N8nText>
						<N8nButton
							variant="brand"
							icon="n8n-assistant"
							:label="i18n.baseText('mcpServers.assistant.build.button')"
							:disabled="assistantOpen"
							data-test-id="mcp-server-build-with-assistant-button"
							data-attr="mcp-server-build-with-assistant"
							@click="emit('build-with-assistant')"
						/>
					</div>
					<div :class="$style.divider">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.tools.empty.or') }}
						</N8nText>
					</div>
				</template>
				<N8nText v-else color="text-light" align="center">
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
						:can-generate="canGenerate"
						:drafting="draftingIds.has(tool.id)"
						:generating="generatingFields(tool.id)"
						:workflow-href="tool.targetId ? workflowHref(tool.targetId) : null"
						:initially-expanded="!!expandName && tool.toolName === expandName"
						:highlighted="highlightedIds.has(tool.id)"
						@update="onUpdate(tool, $event)"
						@remove="onRemove(tool)"
						@generate="onGenerate(tool, $event)"
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

.assistant {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
}

.divider {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	width: 60%;

	&::before,
	&::after {
		content: '';
		flex: 1;
		border-top: var(--border);
	}
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
