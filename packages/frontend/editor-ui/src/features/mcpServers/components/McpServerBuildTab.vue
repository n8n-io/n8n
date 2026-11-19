<script lang="ts" setup>
import type {
	McpServerDetailDto,
	McpServerResourceDto,
	McpServerSkillTargetDto,
	McpServerToolDto,
	McpServerToolKind,
	McpServerToolTargetDto,
} from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
	useMessage,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';

import type { McpServerTab } from '../constants';
import { useMcpServersStore } from '../mcpServers.store';
import { RESOURCE_KIND_LABEL_KEYS } from '../mcpServers.utils';
import McpServerCanvas from './McpServerCanvas.vue';
import McpServerSkillPickerDialog from './McpServerSkillPickerDialog.vue';
import McpServerTextResourceDialog from './McpServerTextResourceDialog.vue';
import McpServerToolPickerDialog from './McpServerToolPickerDialog.vue';
import McpServerToolRow from './McpServerToolRow.vue';

/** The backend limit for one resource body. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

type ResourceAddAction = 'skill' | 'text' | 'file';

const props = defineProps<{
	server: McpServerDetailDto;
	assistantAvailable: boolean;
	/** Tools the Assistant changed a moment ago. */
	highlightToolIds?: string[];
}>();

const emit = defineEmits<{ openTab: [tab: McpServerTab] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const store = useMcpServersStore();

const view = ref<'list' | 'canvas'>('list');
const expandedToolId = ref<string | null>(null);
const focusedToolId = ref<string | null>(null);
const toolPicker = ref<{ kind?: McpServerToolKind; replaceTool?: McpServerToolDto } | null>(null);
const skillPickerOpen = ref(false);
const textDialogOpen = ref(false);
const addingText = ref(false);
const instructions = ref(props.server.instructions);
const instructionsFocused = ref(false);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

watch(
	() => props.server.instructions,
	(value) => {
		if (!instructionsFocused.value) instructions.value = value;
	},
);

const viewOptions = computed(() => [
	{ value: 'list' as const, label: i18n.baseText('mcpServers.build.view.list') },
	{ value: 'canvas' as const, label: i18n.baseText('mcpServers.build.view.canvas') },
]);

const isEmpty = computed(
	() => props.server.tools.length === 0 && props.server.resources.length === 0,
);

const highlighted = computed(() => new Set(props.highlightToolIds ?? []));
const addedTargetIds = computed(() => props.server.tools.map((tool) => tool.targetId));
const addedSkillIds = computed(() =>
	props.server.resources
		.filter((resource) => resource.kind === 'skill' && resource.targetId)
		.map((resource) => resource.targetId ?? ''),
);

const resourceActions = computed(() => [
	{
		id: 'skill' as const,
		label: i18n.baseText('mcpServers.build.resources.add.skill'),
		icon: 'book-open' as const,
	},
	{
		id: 'text' as const,
		label: i18n.baseText('mcpServers.build.resources.add.text'),
		icon: 'file-text' as const,
	},
	{
		id: 'file' as const,
		label: i18n.baseText('mcpServers.build.resources.add.file'),
		icon: 'upload' as const,
	},
]);

function toggleTool(toolId: string) {
	expandedToolId.value = expandedToolId.value === toolId ? null : toolId;
}

async function focusTool(toolId: string) {
	view.value = 'list';
	expandedToolId.value = toolId;
	focusedToolId.value = toolId;
	await nextTick();
	document
		.querySelector(`[data-tool-id="${CSS.escape(toolId)}"]`)
		?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	setTimeout(() => {
		if (focusedToolId.value === toolId) focusedToolId.value = null;
	}, 2000);
}

defineExpose({ focusTool });

function openToolPicker(kind?: McpServerToolKind) {
	toolPicker.value = { kind };
}

async function onPickTarget(target: McpServerToolTargetDto) {
	const replaceTool = toolPicker.value?.replaceTool;
	toolPicker.value = null;
	try {
		if (replaceTool) {
			await store.updateTool(props.server.id, replaceTool.id, { targetId: target.id });
			return;
		}
		const before = new Set(props.server.tools.map((tool) => tool.id));
		const updated = await store.addTool(props.server.id, {
			kind: target.kind,
			targetId: target.id,
		});
		const added = updated.tools.find((tool) => !before.has(tool.id));
		if (added) void focusTool(added.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.build.tools.addError'));
	}
}

function onResourceAction(action: ResourceAddAction) {
	if (action === 'skill') skillPickerOpen.value = true;
	else if (action === 'text') textDialogOpen.value = true;
	else fileInput.value?.click();
}

async function onPickSkill(skill: McpServerSkillTargetDto) {
	skillPickerOpen.value = false;
	try {
		await store.addResource(props.server.id, { kind: 'skill', targetId: skill.id });
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.build.resources.addError'));
	}
}

async function onSaveText(value: { name: string; description: string; content: string }) {
	addingText.value = true;
	try {
		await store.addResource(props.server.id, {
			kind: 'text',
			name: value.name,
			description: value.description || undefined,
			content: value.content,
			mimeType: 'text/markdown',
		});
		textDialogOpen.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.build.resources.addError'));
	} finally {
		addingText.value = false;
	}
}

async function onFileSelected(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) return;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;
	if (file.size > MAX_FILE_BYTES) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('mcpServers.build.resources.fileTooLarge'),
		});
		return;
	}
	try {
		const content = await file.text();
		await store.addResource(props.server.id, {
			kind: 'file',
			name: file.name,
			content,
			mimeType: file.type || 'text/plain',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.build.resources.addError'));
	}
}

async function onRemoveResource(resource: McpServerResourceDto) {
	const choice = await message.confirm(
		i18n.baseText('mcpServers.build.resources.remove.message', {
			interpolate: { name: resource.name },
		}),
		i18n.baseText('mcpServers.build.resources.remove.title'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('mcpServers.build.resources.remove.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (choice !== MODAL_CONFIRM) return;
	try {
		await store.removeResource(props.server.id, resource.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.build.resources.removeError'));
	}
}

async function onInstructionsBlur() {
	instructionsFocused.value = false;
	if (instructions.value === props.server.instructions) return;
	try {
		await store.updateServer(props.server.id, { instructions: instructions.value });
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.saveError'));
	}
}

function resourceIcon(resource: McpServerResourceDto) {
	if (resource.kind === 'skill') return 'book-open' as const;
	if (resource.kind === 'text') return 'file-text' as const;
	return 'file' as const;
}
</script>

<template>
	<div :class="$style.build" data-testid="mcp-server-build-tab">
		<!-- Start state for a new, empty server -->
		<section v-if="isEmpty" :class="$style.start" data-testid="mcp-server-start">
			<N8nIcon icon="mcp" :size="32" :class="$style.startIcon" />
			<N8nHeading tag="h3" size="medium" bold>
				{{
					i18n.baseText(
						assistantAvailable ? 'mcpServers.start.assistant' : 'mcpServers.start.noAssistant',
					)
				}}
			</N8nHeading>
			<N8nText color="text-light">{{ i18n.baseText('mcpServers.start.byHand') }}</N8nText>
			<div :class="$style.startButtons">
				<N8nButton variant="outline" icon="workflow" @click="openToolPicker('workflow')">
					{{ i18n.baseText('mcpServers.start.addWorkflow') }}
				</N8nButton>
				<N8nButton variant="outline" icon="bot" @click="openToolPicker('agent')">
					{{ i18n.baseText('mcpServers.start.addAgent') }}
				</N8nButton>
				<N8nButton variant="outline" icon="book-open" @click="skillPickerOpen = true">
					{{ i18n.baseText('mcpServers.start.addSkill') }}
				</N8nButton>
				<N8nButton variant="outline" icon="plug" disabled>
					{{ i18n.baseText('mcpServers.start.external') }}
				</N8nButton>
			</div>
		</section>

		<template v-else>
			<div :class="$style.viewSwitch">
				<N8nSegmentControl
					v-model="view"
					:options="viewOptions"
					size="small"
					data-testid="mcp-server-build-view"
				/>
			</div>

			<McpServerCanvas
				v-if="view === 'canvas'"
				:server="server"
				@open-tool="focusTool"
				@open-tab="emit('openTab', $event)"
			/>

			<template v-else>
				<!-- Tools -->
				<section :class="$style.section" data-testid="mcp-server-tools">
					<header :class="$style.sectionHeader">
						<N8nHeading tag="h3" size="small" bold>
							{{ i18n.baseText('mcpServers.build.tools.title') }}
						</N8nHeading>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.build.tools.subtitle') }}
						</N8nText>
						<span :class="$style.spacer" />
						<N8nButton
							variant="outline"
							size="small"
							icon="plus"
							data-testid="mcp-server-add-tool"
							@click="openToolPicker()"
						>
							{{ i18n.baseText('mcpServers.build.tools.add') }}
						</N8nButton>
					</header>
					<div :class="$style.list">
						<McpServerToolRow
							v-for="tool in server.tools"
							:key="tool.id"
							:server-id="server.id"
							:tool="tool"
							:expanded="expandedToolId === tool.id"
							:highlighted="focusedToolId === tool.id || highlighted.has(tool.id)"
							@toggle="toggleTool(tool.id)"
							@pick-target="toolPicker = { kind: $event.kind, replaceTool: $event }"
						/>
						<N8nText v-if="server.tools.length === 0" size="small" color="text-light">
							{{ i18n.baseText('mcpServers.build.tools.empty') }}
						</N8nText>
					</div>
					<div :class="$style.quickAdd">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.build.tools.quickAdd') }}
						</N8nText>
						<N8nButton
							variant="ghost"
							size="small"
							icon="workflow"
							@click="openToolPicker('workflow')"
						>
							{{ i18n.baseText('mcpServers.tool.kind.workflow') }}
						</N8nButton>
						<N8nButton variant="ghost" size="small" icon="bot" @click="openToolPicker('agent')">
							{{ i18n.baseText('mcpServers.tool.kind.agent') }}
						</N8nButton>
						<N8nButton variant="ghost" size="small" icon="plug" disabled>
							{{ i18n.baseText('mcpServers.build.externalToolsSoon') }}
						</N8nButton>
					</div>
				</section>

				<!-- Skills and resources -->
				<section :class="$style.section" data-testid="mcp-server-resources">
					<header :class="$style.sectionHeader">
						<N8nHeading tag="h3" size="small" bold>
							{{ i18n.baseText('mcpServers.build.resources.title') }}
						</N8nHeading>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.build.resources.subtitle') }}
						</N8nText>
						<span :class="$style.spacer" />
						<N8nActionToggle
							:actions="resourceActions"
							placement="bottom-end"
							data-testid="mcp-server-add-resource"
							@action="onResourceAction"
						>
							<N8nButton variant="outline" size="small" icon="plus">
								{{ i18n.baseText('mcpServers.build.resources.add') }}
							</N8nButton>
						</N8nActionToggle>
						<input
							ref="fileInput"
							type="file"
							:class="$style.hiddenInput"
							data-testid="mcp-server-resource-file"
							@change="onFileSelected"
						/>
					</header>
					<div :class="$style.list">
						<div
							v-for="resource in server.resources"
							:key="resource.id"
							:class="$style.resource"
							data-testid="mcp-server-resource-row"
						>
							<span :class="$style.resourceIcon">
								<N8nIcon :icon="resourceIcon(resource)" />
							</span>
							<div :class="$style.resourceText">
								<N8nText bold>{{ resource.name }}</N8nText>
								<N8nText v-if="resource.description" size="small" color="text-light">
									{{ resource.description }}
								</N8nText>
								<span :class="$style.uri">{{ resource.uri }}</span>
							</div>
							<N8nBadge variant="outline" size="small">
								{{ i18n.baseText(RESOURCE_KIND_LABEL_KEYS[resource.kind]) }}
							</N8nBadge>
							<N8nTooltip :content="i18n.baseText('mcpServers.build.resources.remove.title')">
								<N8nIconButton
									icon="trash-2"
									variant="ghost"
									size="small"
									:aria-label="i18n.baseText('mcpServers.build.resources.remove.title')"
									data-testid="mcp-server-resource-remove"
									@click="onRemoveResource(resource)"
								/>
							</N8nTooltip>
						</div>
						<N8nText v-if="server.resources.length === 0" size="small" color="text-light">
							{{ i18n.baseText('mcpServers.build.resources.empty') }}
						</N8nText>
					</div>
				</section>
			</template>
		</template>

		<!-- Instructions -->
		<section v-if="view === 'list' || isEmpty" :class="$style.section">
			<header :class="$style.sectionHeader">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.build.instructions.title') }}
				</N8nHeading>
			</header>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('mcpServers.build.instructions.subtitle') }}
			</N8nText>
			<N8nInput
				v-model="instructions"
				type="textarea"
				:rows="4"
				:placeholder="i18n.baseText('mcpServers.build.instructions.placeholder')"
				data-testid="mcp-server-instructions"
				@focus="instructionsFocused = true"
				@blur="onInstructionsBlur"
			/>
		</section>

		<!-- More MCP capabilities -->
		<section v-if="view === 'list' && !isEmpty" :class="$style.section">
			<header :class="$style.sectionHeader">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.build.more.title') }}
				</N8nHeading>
			</header>
			<div :class="$style.soonGrid">
				<div :class="$style.soonCard">
					<N8nText bold>{{ i18n.baseText('mcpServers.build.more.prompts') }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('mcpServers.build.more.prompts.description') }}
					</N8nText>
					<N8nBadge variant="subtle" size="xsmall">{{
						i18n.baseText('mcpServers.comingSoon')
					}}</N8nBadge>
				</div>
				<div :class="$style.soonCard">
					<N8nText bold>{{ i18n.baseText('mcpServers.build.more.apps') }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('mcpServers.build.more.apps.description') }}
					</N8nText>
					<N8nBadge variant="subtle" size="xsmall">{{
						i18n.baseText('mcpServers.comingSoon')
					}}</N8nBadge>
				</div>
				<div :class="$style.soonCard">
					<N8nText bold>{{ i18n.baseText('mcpServers.build.more.importExport') }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('mcpServers.build.more.importExport.description') }}
					</N8nText>
					<N8nBadge variant="subtle" size="xsmall">{{
						i18n.baseText('mcpServers.comingSoon')
					}}</N8nBadge>
				</div>
			</div>
		</section>

		<McpServerToolPickerDialog
			v-if="toolPicker"
			:kind="toolPicker.kind"
			:added-target-ids="addedTargetIds"
			:title="
				toolPicker.replaceTool
					? i18n.baseText('mcpServers.picker.replaceTitle', {
							interpolate: { name: toolPicker.replaceTool.name },
						})
					: undefined
			"
			@close="toolPicker = null"
			@pick="onPickTarget"
		/>
		<McpServerSkillPickerDialog
			v-if="skillPickerOpen"
			:added-skill-ids="addedSkillIds"
			@close="skillPickerOpen = false"
			@pick="onPickSkill"
		/>
		<McpServerTextResourceDialog
			v-if="textDialogOpen"
			:saving="addingText"
			@close="textDialogOpen = false"
			@save="onSaveText"
		/>
	</div>
</template>

<style lang="scss" module>
.build {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.viewSwitch {
	display: flex;
	justify-content: flex-end;
	margin-bottom: calc(var(--spacing--sm) * -1);
}

.start {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--lg);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
	text-align: center;
}

.startIcon {
	color: var(--text-color--subtle);
}

.startButtons {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.spacer {
	flex: 1;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.quickAdd {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
}

.resource {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.resourceIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--md);
	height: var(--height--md);
	border-radius: var(--radius);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
	flex-shrink: 0;
}

.resourceText {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.uri {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtler);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.hiddenInput {
	display: none;
}

.soonGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: var(--spacing--xs);
}

.soonCard {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
	opacity: 0.7;
}
</style>
