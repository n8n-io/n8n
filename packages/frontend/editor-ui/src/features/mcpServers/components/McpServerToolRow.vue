<script lang="ts" setup>
import type {
	McpServerToolBehavior,
	McpServerToolDto,
	McpServerToolInput,
	UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { mcpServerToolNameSchema } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nSwitch,
	N8nText,
	N8nTooltip,
	useMessage,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { MODAL_CONFIRM } from '@/app/constants';

import { useMcpServersStore } from '../mcpServers.store';
import { BEHAVIOR_BADGE_VARIANTS, BEHAVIOR_LABEL_KEYS } from '../mcpServers.utils';
import McpServerToolInputsEditor from './McpServerToolInputsEditor.vue';

const BEHAVIORS: McpServerToolBehavior[] = ['read', 'write', 'delete'];
const INPUTS_SAVE_DELAY_MS = 800;

const props = defineProps<{
	serverId: string;
	tool: McpServerToolDto;
	expanded: boolean;
	highlighted?: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
	pickTarget: [tool: McpServerToolDto];
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();
const store = useMcpServersStore();

// The tool comes from a reactive store, so it is a Proxy that structuredClone rejects.
function cloneInputs(source: McpServerToolInput[]): McpServerToolInput[] {
	return source.map((input) => ({ ...input }));
}

const name = ref(props.tool.name);
const description = ref(props.tool.description);
const inputs = ref<McpServerToolInput[]>(cloneInputs(props.tool.inputs));
const showInputs = ref(false);
const nameFocused = ref(false);
const descriptionFocused = ref(false);
const inputsDirty = ref(false);
const saveState = ref<'idle' | 'saving' | 'saved'>('idle');
let savedTimer: ReturnType<typeof setTimeout> | undefined;

watch(
	() => props.tool,
	(tool) => {
		if (!nameFocused.value) name.value = tool.name;
		if (!descriptionFocused.value) description.value = tool.description;
		if (!inputsDirty.value) inputs.value = cloneInputs(tool.inputs);
	},
	{ deep: true },
);

const kindLabel = computed(() =>
	i18n.baseText(
		props.tool.kind === 'workflow' ? 'mcpServers.tool.kind.workflow' : 'mcpServers.tool.kind.agent',
	),
);

const targetHref = computed(() => {
	if (props.tool.kind === 'workflow') {
		return router.resolve(`/workflow/${props.tool.targetId}`).href;
	}
	if (!props.tool.targetProjectId) return undefined;
	return router.resolve(`/projects/${props.tool.targetProjectId}/agents/${props.tool.targetId}`)
		.href;
});

const inputsSummary = computed(() =>
	i18n.baseText(
		props.tool.kind === 'workflow'
			? 'mcpServers.tool.inputs.summary.workflow'
			: 'mcpServers.tool.inputs.summary.agent',
		{ adjustToNumber: inputs.value.length, interpolate: { count: inputs.value.length } },
	),
);

async function save(body: UpdateMcpServerToolDto) {
	clearTimeout(savedTimer);
	saveState.value = 'saving';
	try {
		await store.updateTool(props.serverId, props.tool.id, body);
		saveState.value = 'saved';
		savedTimer = setTimeout(() => (saveState.value = 'idle'), 2000);
	} catch (error) {
		saveState.value = 'idle';
		toast.showError(error, i18n.baseText('mcpServers.tool.saveError'));
		throw error;
	}
}

function blurTarget(event: KeyboardEvent) {
	if (event.target instanceof HTMLElement) event.target.blur();
}

async function onNameBlur() {
	nameFocused.value = false;
	const value = name.value.trim();
	if (value === props.tool.name) return;
	if (!value) {
		await save({ name: null }).catch(() => {});
		return;
	}
	const parsed = mcpServerToolNameSchema.safeParse(value);
	if (!parsed.success) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('mcpServers.tool.name.invalid'),
		});
		name.value = props.tool.name;
		return;
	}
	await save({ name: value }).catch(() => (name.value = props.tool.name));
}

async function onDescriptionBlur() {
	descriptionFocused.value = false;
	if (description.value === props.tool.description) return;
	await save({ description: description.value }).catch(
		() => (description.value = props.tool.description),
	);
}

function isBehavior(value: unknown): value is McpServerToolBehavior {
	return typeof value === 'string' && (BEHAVIORS as string[]).includes(value);
}

async function onBehaviorChange(value: unknown) {
	if (!isBehavior(value) || value === props.tool.behavior) return;
	await save({ behavior: value }).catch(() => {});
}

async function onEnabledChange(value: boolean) {
	await save({ enabled: value }).catch(() => {});
}

const saveInputs = useDebounceFn(async () => {
	try {
		await save({ inputs: inputs.value.filter((input) => input.name.trim().length > 0) });
	} catch {
		// The toast already shows the error. Keep the edits so the person can fix them.
		return;
	}
	inputsDirty.value = false;
}, INPUTS_SAVE_DELAY_MS);

function onInputsChange(next: McpServerToolInput[]) {
	inputs.value = next;
	inputsDirty.value = true;
	void saveInputs();
}

async function reset(field: 'name' | 'description' | 'inputs') {
	if (field === 'inputs') inputsDirty.value = false;
	await save({ [field]: null }).catch(() => {});
}

async function onRemove() {
	const choice = await message.confirm(
		i18n.baseText('mcpServers.tool.remove.message', { interpolate: { name: props.tool.name } }),
		i18n.baseText('mcpServers.tool.remove.title'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('mcpServers.tool.remove.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (choice !== MODAL_CONFIRM) return;
	try {
		await store.removeTool(props.serverId, props.tool.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.tool.remove.error'));
	}
}
</script>

<template>
	<div
		:class="[$style.tool, { [$style.expanded]: expanded, [$style.highlighted]: highlighted }]"
		:data-tool-id="tool.id"
		data-testid="mcp-server-tool-row"
	>
		<div
			:class="$style.row"
			role="button"
			tabindex="0"
			:aria-expanded="expanded"
			@click="emit('toggle')"
			@keydown.enter.prevent="emit('toggle')"
		>
			<span :class="$style.kindIcon">
				<N8nIcon :icon="tool.kind === 'workflow' ? 'workflow' : 'bot'" />
			</span>
			<div :class="$style.title">
				<span :class="[$style.toolName, { [$style.off]: !tool.enabled }]">{{ tool.name }}</span>
				<N8nText size="small" color="text-light" :class="$style.target">
					{{ kindLabel }} · {{ tool.targetName }}
				</N8nText>
			</div>
			<N8nTooltip v-if="!tool.available" :content="tool.unavailableReason">
				<N8nIcon icon="triangle-alert" :class="$style.warn" />
			</N8nTooltip>
			<N8nBadge :variant="BEHAVIOR_BADGE_VARIANTS[tool.behavior]" size="small">
				{{ i18n.baseText(BEHAVIOR_LABEL_KEYS[tool.behavior]) }}
			</N8nBadge>
			<span @click.stop>
				<N8nSwitch
					:model-value="tool.enabled"
					:aria-label="i18n.baseText('mcpServers.tool.enabled')"
					data-testid="mcp-server-tool-enabled"
					@update:model-value="onEnabledChange"
				/>
			</span>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" :class="$style.chevron" />
		</div>

		<div v-if="expanded" :class="$style.editor" data-testid="mcp-server-tool-editor">
			<N8nCallout v-if="!tool.available" theme="warning" icon="triangle-alert">
				{{ tool.unavailableReason ?? i18n.baseText('mcpServers.tool.unavailable') }}
			</N8nCallout>

			<div :class="$style.linked">
				<div :class="$style.linkedHeader">
					<N8nText size="small" bold>
						{{
							i18n.baseText(
								tool.kind === 'workflow'
									? 'mcpServers.tool.linked.workflow'
									: 'mcpServers.tool.linked.agent',
							)
						}}
					</N8nText>
					<N8nText size="small">{{ tool.targetName }}</N8nText>
					<N8nButton
						variant="ghost"
						size="mini"
						data-testid="mcp-server-tool-pick-another"
						@click="emit('pickTarget', tool)"
					>
						{{
							i18n.baseText(
								tool.kind === 'workflow'
									? 'mcpServers.tool.pickAnother.workflow'
									: 'mcpServers.tool.pickAnother.agent',
							)
						}}
					</N8nButton>
					<span :class="$style.spacer" />
					<N8nLink
						v-if="targetHref"
						:to="targetHref"
						new-window
						size="small"
						data-testid="mcp-server-tool-open-target"
					>
						{{
							i18n.baseText(
								tool.kind === 'workflow'
									? 'mcpServers.tool.openWorkflow'
									: 'mcpServers.tool.openAgent',
							)
						}}
						<N8nIcon icon="external-link" size="xsmall" />
					</N8nLink>
				</div>
				<div v-if="tool.kind === 'workflow'" :class="$style.flow">
					<span :class="[$style.node, $style.nodeEdge]">
						{{ i18n.baseText('mcpServers.tool.preview.start') }}
					</span>
					<template v-for="(node, index) in tool.previewNodes ?? []" :key="index">
						<N8nIcon icon="arrow-right" size="small" :class="$style.arrow" />
						<span :class="$style.node" :title="node.type">{{ node.name }}</span>
					</template>
					<N8nIcon icon="arrow-right" size="small" :class="$style.arrow" />
					<span :class="[$style.node, $style.nodeEdge]">
						{{ i18n.baseText('mcpServers.tool.preview.end') }}
					</span>
				</div>
				<div v-else :class="$style.flow">
					<span :class="[$style.node, $style.nodeEdge]">
						<N8nIcon icon="bot" size="small" /> {{ tool.targetName }}
					</span>
					<N8nBadge variant="subtle" size="small">{{ kindLabel }}</N8nBadge>
				</div>
			</div>

			<div :class="$style.fields">
				<N8nInputLabel :label="i18n.baseText('mcpServers.tool.name.label')">
					<template v-if="tool.nameOverride !== null" #persistentOptions>
						<N8nLink size="small" theme="text" @click="reset('name')">
							{{ i18n.baseText('mcpServers.tool.reset') }}
						</N8nLink>
					</template>
					<N8nInput
						v-model="name"
						:class="$style.mono"
						size="medium"
						data-testid="mcp-server-tool-name"
						@focus="nameFocused = true"
						@blur="onNameBlur"
						@keydown.enter="blurTarget"
					/>
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('mcpServers.tool.behavior.label')">
					<N8nSelect
						:model-value="tool.behavior"
						size="medium"
						data-testid="mcp-server-tool-behavior"
						@update:model-value="onBehaviorChange"
					>
						<N8nOption
							v-for="behavior in BEHAVIORS"
							:key="behavior"
							:value="behavior"
							:label="i18n.baseText(BEHAVIOR_LABEL_KEYS[behavior])"
						/>
					</N8nSelect>
				</N8nInputLabel>
			</div>

			<N8nInputLabel :label="i18n.baseText('mcpServers.tool.description.label')">
				<template v-if="tool.descriptionOverride !== null" #persistentOptions>
					<N8nLink size="small" theme="text" @click="reset('description')">
						{{ i18n.baseText('mcpServers.tool.reset') }}
					</N8nLink>
				</template>
				<N8nInput
					v-model="description"
					type="textarea"
					:rows="3"
					data-testid="mcp-server-tool-description"
					@focus="descriptionFocused = true"
					@blur="onDescriptionBlur"
				/>
			</N8nInputLabel>

			<div :class="$style.inputs">
				<button
					type="button"
					:class="$style.inputsToggle"
					data-testid="mcp-server-tool-inputs-toggle"
					@click="showInputs = !showInputs"
				>
					<N8nIcon :icon="showInputs ? 'chevron-down' : 'chevron-right'" size="small" />
					<N8nText size="small" bold>{{ inputsSummary }}</N8nText>
				</button>
				<N8nLink
					v-if="tool.inputsOverridden"
					size="small"
					theme="text"
					:class="$style.inputsReset"
					@click="reset('inputs')"
				>
					{{ i18n.baseText('mcpServers.tool.reset') }}
				</N8nLink>
			</div>
			<McpServerToolInputsEditor
				v-if="showInputs"
				:inputs="inputs"
				:kind="tool.kind"
				@update:inputs="onInputsChange"
			/>

			<div :class="$style.footer">
				<N8nText v-if="saveState !== 'idle'" size="small" color="text-light">
					{{ i18n.baseText(saveState === 'saving' ? 'mcpServers.saving' : 'mcpServers.saved') }}
				</N8nText>
				<span :class="$style.spacer" />
				<N8nButton
					variant="ghost"
					size="small"
					icon="trash-2"
					:class="$style.danger"
					data-testid="mcp-server-tool-remove"
					@click="onRemove"
				>
					{{ i18n.baseText('mcpServers.tool.remove.button') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.tool {
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	transition: box-shadow var(--duration--snappy) var(--easing--ease-out);
}

.expanded {
	box-shadow: var(--shadow--xs);
}

.highlighted {
	border-color: var(--color--primary);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	cursor: pointer;

	&:focus-visible {
		outline: var(--border-width) solid var(--color--primary);
		border-radius: var(--radius--lg);
	}
}

.kindIcon {
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

.title {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.toolName {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.off {
	color: var(--text-color--subtler);
	text-decoration: line-through;
}

.target {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.warn {
	color: var(--color--warning);
}

.chevron {
	color: var(--text-color--subtle);
}

.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-top: var(--border);
}

.linked {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.linkedHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.flow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
}

.node {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.nodeEdge {
	border-style: dashed;
	color: var(--text-color--subtle);
}

.arrow {
	color: var(--text-color--subtler);
}

.fields {
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: var(--spacing--sm);
}

.mono :global(input) {
	font-family: var(--font-family--monospace);
}

.inputs {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.inputsToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0;
	border: none;
	background: none;
	color: var(--text-color);
	cursor: pointer;
	font: inherit;
}

.inputsReset {
	margin-left: var(--spacing--3xs);
}

.footer {
	display: flex;
	align-items: center;
}

.spacer {
	flex: 1;
}

.danger {
	color: var(--text-color--danger);
}
</style>
