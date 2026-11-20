<script setup lang="ts">
import type {
	AgentToolGuardrailConfig,
	AgentToolGuardrailKind,
	AgentToolGuardrailToolRef,
	ToolGuardrailPiiEntity,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDropdownMenu,
	N8nIcon,
	N8nInput,
	N8nInputNumber,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import type { AgentJsonToolRef } from '../types';
import {
	guardrailKindLabelKey,
	PII_ENTITY_LABELS,
	slugifyGuardrailId,
	TOOL_GUARDRAIL_KINDS,
} from '../utils/guardrails';
import AgentModal from './modals/AgentModal.vue';
import AgentTagInput from './AgentTagInput.vue';

const props = withDefaults(
	defineProps<{
		open: boolean;
		/** The saved entry in edit mode. Absent in create mode. */
		guardrail?: AgentToolGuardrailConfig | null;
		/** Preselected kind in create mode. */
		kind?: AgentToolGuardrailKind;
		/** The agent's configured tools, for the "Which tools" picker. */
		tools?: AgentJsonToolRef[];
		/** Ids of guardrails that already exist, so a create cannot duplicate one. */
		existingIds?: string[];
		disabled?: boolean;
	}>(),
	{
		guardrail: null,
		kind: 'keywords',
		tools: () => [],
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	save: [guardrail: AgentToolGuardrailConfig];
	remove: [];
}>();

const i18n = useI18n();

const isEditing = computed(() => props.guardrail !== null);

const name = ref('');
const selectedKind = ref<AgentToolGuardrailKind>('keywords');
const keywords = ref<string[]>([]);
const piiType = ref<'all' | 'selected'>('all');
const piiEntities = ref<ToolGuardrailPiiEntity[]>([]);
const permissiveness = ref<'strict' | 'balanced' | 'permissive'>('balanced');
const allowedUrls = ref<string[]>([]);
const allowedSchemes = ref<string[]>(['https']);
const blockUserinfo = ref(true);
const allowSubdomains = ref(false);
const prompt = ref('');
const threshold = ref<number | undefined>();
const stage = ref<'before' | 'after'>('before');
const toolScope = ref<'all' | 'selected'>('all');
const selectedToolKeys = ref<string[]>([]);

/** True while the form is loaded from the entry, so a kind change does not wipe it. */
let initializing = false;

function resetKindFields() {
	keywords.value = [];
	piiType.value = 'all';
	piiEntities.value = [];
	permissiveness.value = 'balanced';
	allowedUrls.value = [];
	allowedSchemes.value = ['https'];
	blockUserinfo.value = true;
	allowSubdomains.value = false;
	prompt.value = '';
	threshold.value = undefined;
}

function toolRefKey(ref: AgentToolGuardrailToolRef): string {
	return ref.type === 'workflow' ? `workflow:${ref.workflowId}` : `node:${ref.name}`;
}

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		initializing = true;
		const guardrail = props.guardrail;
		name.value = guardrail?.name ?? '';
		selectedKind.value = guardrail?.kind ?? props.kind;
		resetKindFields();
		if (guardrail) {
			switch (guardrail.kind) {
				case 'keywords':
					keywords.value = [...guardrail.keywords];
					break;
				case 'pii':
					piiType.value = guardrail.type;
					piiEntities.value = guardrail.type === 'selected' ? [...(guardrail.entities ?? [])] : [];
					break;
				case 'secretKeys':
					permissiveness.value = guardrail.permissiveness;
					break;
				case 'urls':
					allowedUrls.value = [...(guardrail.allowedUrls ?? [])];
					allowedSchemes.value = [...(guardrail.allowedSchemes ?? ['https'])];
					blockUserinfo.value = guardrail.blockUserinfo ?? true;
					allowSubdomains.value = guardrail.allowSubdomains ?? false;
					break;
				default:
					// The model-based kinds: jailbreak, nsfw, topicalAlignment.
					prompt.value = guardrail.prompt ?? '';
					threshold.value = guardrail.threshold;
			}
		}
		stage.value = guardrail?.stage ?? 'before';
		toolScope.value = guardrail?.tools ? 'selected' : 'all';
		selectedToolKeys.value = (guardrail?.tools ?? []).map(toolRefKey);
		initializing = false;
	},
	{ immediate: true },
);

/** A kind switch drops the previous kind's options; shared fields stay. */
watch(selectedKind, () => {
	if (!initializing) resetKindFields();
});

type ToolOption = { key: string; ref: AgentToolGuardrailToolRef; label: string };

/** Workflow tools without a stable id cannot be referenced, so the picker skips them. */
const toolOptions = computed<ToolOption[]>(() =>
	props.tools.flatMap<ToolOption>((tool) => {
		if (tool.type === 'node') {
			return [
				{ key: `node:${tool.name}`, ref: { type: 'node', name: tool.name }, label: tool.name },
			];
		}
		if (tool.type === 'workflow' && tool.workflowId) {
			return [
				{
					key: `workflow:${tool.workflowId}`,
					ref: { type: 'workflow', workflowId: tool.workflowId },
					label: tool.name ?? tool.workflow,
				},
			];
		}
		return [];
	}),
);

const selectedTools = computed<AgentToolGuardrailToolRef[]>(() =>
	selectedToolKeys.value.flatMap((key) => {
		const option = toolOptions.value.find((candidate) => candidate.key === key);
		return option ? [option.ref] : [];
	}),
);

const kindOptions = computed(() =>
	TOOL_GUARDRAIL_KINDS.map((value) => ({
		value,
		label: i18n.baseText(guardrailKindLabelKey(value)),
	})),
);

/** Dropdown-menu items for the guardrail type, with the current kind checked. */
const kindMenuItems = computed(() =>
	kindOptions.value.map(({ value, label }) => ({
		id: value,
		label,
		checked: value === selectedKind.value,
		testId: `agent-guardrail-type-option-${value}`,
	})),
);

const selectedKindLabel = computed(
	() => kindOptions.value.find((option) => option.value === selectedKind.value)?.label ?? '',
);

function onKindMenuSelect(kind: string) {
	selectedKind.value = kind as AgentToolGuardrailKind;
}

const permissivenessOptions = computed(() =>
	(['strict', 'balanced', 'permissive'] as const).map((value) => ({
		value,
		label: i18n.baseText(`agents.builder.guardrails.secretKeys.${value}` as BaseTextKey),
	})),
);

const stageOptions = computed(() =>
	(['before', 'after'] as const).map((value) => ({
		value,
		label: i18n.baseText(`agents.builder.guardrails.trigger.${value}` as BaseTextKey),
	})),
);

const piiEntityOptions = computed(() =>
	(Object.entries(PII_ENTITY_LABELS) as Array<[ToolGuardrailPiiEntity, string]>).map(
		([value, label]) => ({ value, label }),
	),
);

/** Light client checks; the backend schema stays the authority on save. */
const canSave = computed(() => {
	if (toolScope.value === 'selected' && selectedTools.value.length === 0) return false;
	if (selectedKind.value === 'keywords') return keywords.value.length > 0;
	if (selectedKind.value === 'pii') {
		return piiType.value === 'all' || piiEntities.value.length > 0;
	}
	if (threshold.value !== undefined && (threshold.value < 0 || threshold.value > 1)) return false;
	return true;
});

function buildConfig(): AgentToolGuardrailConfig {
	// The id is stable across edits; a create derives it from the name.
	const shared = {
		id:
			props.guardrail?.id ?? slugifyGuardrailId(name.value, selectedKind.value, props.existingIds),
		...(name.value.trim() ? { name: name.value.trim() } : {}),
		stage: stage.value,
		...(toolScope.value === 'selected' ? { tools: selectedTools.value } : {}),
	};

	switch (selectedKind.value) {
		case 'keywords':
			return { kind: 'keywords', ...shared, keywords: keywords.value };
		case 'pii':
			return {
				kind: 'pii',
				...shared,
				type: piiType.value,
				...(piiType.value === 'selected' ? { entities: piiEntities.value } : {}),
			};
		case 'secretKeys':
			return { kind: 'secretKeys', ...shared, permissiveness: permissiveness.value };
		case 'urls':
			return {
				kind: 'urls',
				...shared,
				...(allowedUrls.value.length > 0 ? { allowedUrls: allowedUrls.value } : {}),
				...(allowedSchemes.value.length > 0 ? { allowedSchemes: allowedSchemes.value } : {}),
				blockUserinfo: blockUserinfo.value,
				allowSubdomains: allowSubdomains.value,
			};
		default:
			return {
				kind: selectedKind.value,
				...shared,
				...(prompt.value.trim() ? { prompt: prompt.value.trim() } : {}),
				...(threshold.value !== undefined ? { threshold: threshold.value } : {}),
			};
	}
}

function onSave() {
	if (!canSave.value) return;
	emit('save', buildConfig());
	emit('update:open', false);
}

function onRemove() {
	emit('remove');
	emit('update:open', false);
}
</script>

<template>
	<AgentModal
		:open="open"
		size="medium"
		:title="name"
		:title-placeholder="i18n.baseText('agents.builder.guardrails.name.placeholder')"
		editable-title
		data-testid="agent-guardrail-modal"
		@update:open="emit('update:open', $event)"
		@update:title="name = $event"
	>
		<div :class="$style.content">
			<div :class="$style.group" data-testid="agent-guardrail-config-group">
				<div :class="$style.field" data-testid="agent-guardrail-type-field">
					<div :class="$style.inlineRow">
						<N8nText size="medium" bold>
							{{ i18n.baseText('agents.builder.guardrails.type.label') }}
						</N8nText>
						<N8nDropdownMenu
							:items="kindMenuItems"
							:disabled="disabled"
							placement="bottom-end"
							data-testid="agent-guardrail-type-menu"
							@select="onKindMenuSelect"
						>
							<template #trigger>
								<N8nButton
									variant="outline"
									size="small"
									:disabled="disabled"
									:class="$style.typeTrigger"
									data-testid="agent-guardrail-type"
								>
									<span :class="$style.typeTriggerLabel">{{ selectedKindLabel }}</span>
									<N8nIcon icon="chevron-down" size="small" color="text-light" />
								</N8nButton>
							</template>
						</N8nDropdownMenu>
					</div>
				</div>

				<div :class="$style.divider" aria-hidden="true" />

				<div :class="$style.kindOptions" data-testid="agent-guardrail-kind-options">
					<template v-if="selectedKind === 'keywords'">
						<div :class="$style.field">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.keywords.label') }}
								<N8nText color="primary" bold size="small">*</N8nText>
							</N8nText>
							<AgentTagInput
								v-model="keywords"
								:placeholder="i18n.baseText('agents.builder.guardrails.keywords.placeholder')"
								:disabled="disabled"
								test-id="agent-guardrail-keywords"
							/>
							<N8nText v-if="keywords.length === 0" size="small" :class="$style.hint">
								{{ i18n.baseText('agents.builder.guardrails.keywords.hint') }}
							</N8nText>
						</div>
					</template>

					<template v-else-if="selectedKind === 'pii'">
						<div :class="$style.field">
							<div :class="$style.switchRow">
								<N8nText size="medium" bold>
									{{ i18n.baseText('agents.builder.guardrails.pii.label') }}
								</N8nText>
								<!-- On, every entity is covered. Off narrows to the picked list below. -->
								<div :class="$style.allToggle">
									<N8nText size="small">
										{{ i18n.baseText('agents.builder.guardrails.pii.all') }}
									</N8nText>
									<N8nSwitch2
										:model-value="piiType === 'all'"
										:disabled="disabled"
										size="small"
										:aria-label="i18n.baseText('agents.builder.guardrails.pii.all')"
										data-testid="agent-guardrail-pii-all"
										@update:model-value="piiType = $event ? 'all' : 'selected'"
									/>
								</div>
							</div>
						</div>
						<div v-if="piiType === 'selected'" :class="$style.field">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.pii.entities') }}
								<N8nText color="primary" bold size="small">*</N8nText>
							</N8nText>
							<N8nSelect
								:model-value="piiEntities"
								multiple
								size="small"
								:disabled="disabled"
								:class="$style.tagSelect"
								data-testid="agent-guardrail-pii-entities"
								@update:model-value="piiEntities = $event"
							>
								<N8nOption
									v-for="option in piiEntityOptions"
									:key="option.value"
									:value="option.value"
									:label="option.label"
								/>
							</N8nSelect>
						</div>
					</template>

					<template v-else-if="selectedKind === 'secretKeys'">
						<div :class="$style.field">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.secretKeys.label') }}
							</N8nText>
							<N8nSegmentControl
								:model-value="permissiveness"
								:options="permissivenessOptions"
								:disabled="disabled"
								data-testid="agent-guardrail-permissiveness"
								@update:model-value="permissiveness = $event"
							/>
						</div>
					</template>

					<template v-else-if="selectedKind === 'urls'">
						<div :class="$style.field">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.urls.allowedUrls.label') }}
							</N8nText>
							<AgentTagInput
								v-model="allowedUrls"
								:placeholder="
									i18n.baseText('agents.builder.guardrails.urls.allowedUrls.placeholder')
								"
								:disabled="disabled"
								test-id="agent-guardrail-allowed-urls"
							/>
						</div>
						<div :class="$style.field">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.urls.allowedSchemes.label') }}
							</N8nText>
							<AgentTagInput
								v-model="allowedSchemes"
								:placeholder="
									i18n.baseText('agents.builder.guardrails.urls.allowedSchemes.placeholder')
								"
								:disabled="disabled"
								test-id="agent-guardrail-allowed-schemes"
							/>
						</div>
						<div :class="$style.switchRow">
							<N8nText size="medium">
								{{ i18n.baseText('agents.builder.guardrails.urls.blockUserinfo.label') }}
							</N8nText>
							<N8nSwitch2
								:model-value="blockUserinfo"
								:disabled="disabled"
								size="small"
								:aria-label="i18n.baseText('agents.builder.guardrails.urls.blockUserinfo.label')"
								data-testid="agent-guardrail-block-userinfo"
								@update:model-value="blockUserinfo = $event"
							/>
						</div>
						<div :class="$style.switchRow">
							<N8nText size="medium">
								{{ i18n.baseText('agents.builder.guardrails.urls.allowSubdomains.label') }}
							</N8nText>
							<N8nSwitch2
								:model-value="allowSubdomains"
								:disabled="disabled"
								size="small"
								:aria-label="i18n.baseText('agents.builder.guardrails.urls.allowSubdomains.label')"
								data-testid="agent-guardrail-allow-subdomains"
								@update:model-value="allowSubdomains = $event"
							/>
						</div>
					</template>

					<template v-else>
						<div :class="$style.field">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.model.prompt.label') }}
							</N8nText>
							<N8nInput
								:model-value="prompt"
								type="textarea"
								:rows="3"
								:placeholder="i18n.baseText('agents.builder.guardrails.model.prompt.placeholder')"
								:disabled="disabled"
								data-testid="agent-guardrail-prompt"
								@update:model-value="prompt = $event"
							/>
							<N8nText size="small" :class="$style.hint">
								{{ i18n.baseText('agents.builder.guardrails.model.prompt.hint') }}
							</N8nText>
						</div>
						<div :class="$style.field">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.model.threshold.label') }}
							</N8nText>
							<N8nInputNumber
								:model-value="threshold"
								:min="0"
								:max="1"
								:step="0.05"
								:precision="2"
								:controls="false"
								:disabled="disabled"
								:class="$style.thresholdInput"
								:placeholder="
									i18n.baseText('agents.builder.guardrails.model.threshold.placeholder')
								"
								data-testid="agent-guardrail-threshold"
								@update:model-value="threshold = $event ?? undefined"
							/>
							<N8nText size="small" :class="$style.hint">
								{{ i18n.baseText('agents.builder.guardrails.model.threshold.hint') }}
							</N8nText>
						</div>
					</template>
				</div>
			</div>

			<div :class="$style.group" data-testid="agent-guardrail-trigger-group">
				<div :class="$style.field">
					<N8nText size="medium" bold>
						{{ i18n.baseText('agents.builder.guardrails.trigger.label') }}
						<N8nText color="primary" bold size="small">*</N8nText>
					</N8nText>
					<N8nSelect
						:model-value="stage"
						size="small"
						:disabled="disabled"
						data-testid="agent-guardrail-trigger"
						@update:model-value="stage = $event"
					>
						<N8nOption
							v-for="option in stageOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</div>

				<div :class="$style.field">
					<div :class="$style.switchRow">
						<div :class="$style.switchLabel">
							<N8nText size="medium" bold>
								{{ i18n.baseText('agents.builder.guardrails.tools.all') }}
								<N8nText color="primary" bold size="small">*</N8nText>
							</N8nText>
							<N8nText size="small" :class="$style.hint">
								{{ i18n.baseText('agents.builder.guardrails.tools.toggleHint') }}
							</N8nText>
						</div>
						<!-- On, the guardrail covers every tool. Off narrows to the picked list below. -->
						<N8nSwitch2
							:model-value="toolScope === 'all'"
							:disabled="disabled"
							size="small"
							:aria-label="i18n.baseText('agents.builder.guardrails.tools.all')"
							data-testid="agent-guardrail-tools-all"
							@update:model-value="toolScope = $event ? 'all' : 'selected'"
						/>
					</div>
					<template v-if="toolScope === 'selected'">
						<N8nSelect
							v-if="toolOptions.length > 0"
							:model-value="selectedToolKeys"
							multiple
							size="small"
							:disabled="disabled"
							:class="$style.toolSelect"
							data-testid="agent-guardrail-tools-picker"
							@update:model-value="selectedToolKeys = $event"
						>
							<N8nOption
								v-for="option in toolOptions"
								:key="option.key"
								:value="option.key"
								:label="option.label"
							/>
						</N8nSelect>
						<N8nText v-else size="small" :class="$style.hint">
							{{ i18n.baseText('agents.builder.guardrails.tools.none') }}
						</N8nText>
					</template>
				</div>

				<N8nCallout theme="info" slim data-testid="agent-guardrail-tools-callout">
					{{ i18n.baseText('agents.builder.guardrails.tools.callout') }}
				</N8nCallout>
			</div>
		</div>

		<template v-if="isEditing" #footerLeft>
			<N8nButton
				variant="ghost"
				:disabled="disabled"
				data-testid="agent-guardrail-remove"
				@click="onRemove"
			>
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ i18n.baseText('agents.builder.guardrails.remove') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:disabled="disabled || !canSave"
				data-testid="agent-guardrail-save"
				@click="onSave"
			>
				{{
					isEditing
						? i18n.baseText('generic.save')
						: i18n.baseText('agents.builder.guardrails.create')
				}}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* Element Plus natively selects a focused select's label, so the app-wide
   brand-tinted ::selection reads as a pink highlight on the chosen value.
   Keep the selection invisible on selects; the prompt textarea keeps its
   normal selection tint. */
.content :global(.el-select *)::selection {
	background-color: transparent;
}

/* An outlined group of related fields, per the modal wireframe: the guardrail
   type groups with its kind options, the trigger stage groups with the tool
   scope. */
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--md);
}

/* Spans the group's full inner width, like the capabilities divider. */
.divider {
	flex: initial;
	height: 1px;
	background-color: var(--border-color--subtle);
	margin-inline: calc(var(--spacing--2xs) * -1);
}

.kindOptions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* Label left, control right: the type field is one row, per the wireframe. */
.inlineRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.typeTrigger {
	width: fit-content;
	max-width: 60%;
}

.typeTriggerLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

/* The switch row's label block: bold label with its helper text below. */
.switchLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

/* The "All entities" switch sits at the row's right end, label beside it. */
.allToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.thresholdInput {
	width: 10rem;
}

.toolSelect {
	width: 100%;
}

/* Element Plus sizes the pills of a large multiple select as tall boxes with
   equal padding on every side. Slim them so the horizontal padding outweighs
   the vertical, matching the N8nTag pill shape. */
.tagSelect :global(.el-select__tags .el-tag) {
	height: var(--height--xs);
	padding: 0 var(--spacing--2xs);
	line-height: var(--line-height--xs);
}

.hint {
	color: var(--text-color--subtler);
}
</style>
