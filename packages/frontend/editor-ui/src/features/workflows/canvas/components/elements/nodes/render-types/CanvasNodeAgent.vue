<script setup lang="ts">
import { computed, useCssModule, watch } from 'vue';
import type { INodeParameterResourceLocator, INodeProperties } from 'n8n-workflow';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeAgentRender } from '../../../../canvas.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useAgentCapabilitySummary } from '@/features/agents/composables/useAgentCapabilitySummary';
import { useAgentScopeProjectId } from '@/features/agents/composables/useAgentScopeProjectId';
import { useModelCatalog } from '@/features/agents/composables/useModelCatalog';
import {
	AGENT_MODEL_PROVIDER_DEFINITIONS,
	isAgentModelProvider,
} from '@/features/agents/model-providers';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import AgentSelectorParameterInput from '@/features/ndv/parameters/components/AgentSelectorParameterInput/AgentSelectorParameterInput.vue';
import CanvasNodeStatusIcons from './parts/CanvasNodeStatusIcons.vue';
import CanvasNodeAgentChips from './parts/CanvasNodeAgentChips.vue';
import { buildAgentCardChips } from './parts/canvasNodeAgentChips.utils';
import { useAgentNavigation } from '@/features/agents/composables/useAgentNavigation';

const emit = defineEmits<{
	update: [parameters: Record<string, unknown>];
	activate: [id: string, event?: MouseEvent];
	'open:contextmenu': [event: MouseEvent];
}>();

const $style = useCssModule();
const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const nav = useAgentNavigation();
const { catalog: modelCatalog, ensureLoaded: ensureModelsLoaded } = useModelCatalog();

const {
	id,
	isReadOnly,
	isSelected,
	render,
	executionStatus,
	executionWaiting,
	executionWaitingForNext,
	executionRunning,
	hasRunData,
} = useCanvasNode();

const renderOptions = computed(() => render.value.options as CanvasNodeAgentRender['options']);

// Mirror CanvasNodeDefault's state classes so the card shows the same run
// feedback as every other node (green border + check on success, animated
// glow while running/waiting, red border on error).
const classes = computed(() => ({
	[$style.selected]: isSelected.value,
	[$style.success]: Boolean(hasRunData.value && executionStatus.value === 'success'),
	[$style.error]: executionStatus.value === 'error' || executionStatus.value === 'crashed',
	[$style.running]: Boolean(executionRunning.value || executionWaitingForNext.value),
	[$style.waiting]: Boolean(executionWaiting.value || executionStatus.value === 'waiting'),
}));

const agentResourceLocator = computed<INodeParameterResourceLocator>(
	() => renderOptions.value.agentId ?? { __rl: true, mode: 'list', value: '' },
);

const agentId = computed(() => {
	const value = agentResourceLocator.value.value;
	return typeof value === 'string' ? value : String(value ?? '');
});

const isConfigured = computed(() => agentId.value !== '');

// Shared scope resolution (picker / canvas card / NDV must all read/write
// the same agent record).
const projectId = useAgentScopeProjectId();

const { summary, error } = useAgentCapabilitySummary(projectId, agentId);

const hasError = computed(() => Boolean(error.value));

const agentName = computed(
	() =>
		summary.value?.name ??
		agentResourceLocator.value.cachedResultName ??
		i18n.baseText('agentNode.card.defaultName'),
);

const modelProvider = computed(() => {
	const provider = summary.value?.model?.provider;
	return provider && isAgentModelProvider(provider) ? provider : null;
});

const modelCredentialType = computed(() =>
	modelProvider.value
		? AGENT_MODEL_PROVIDER_DEFINITIONS[modelProvider.value].credentialTypes[0]
		: null,
);

const modelName = computed(() => {
	const model = summary.value?.model;
	if (!model) return '';
	// Resolve the friendly catalog name
	// (e.g. "Claude Opus 4.8"), falling back to the raw id while the catalog
	// loads or for an unknown model.
	return modelCatalog.value[model.provider]?.models[model.model]?.name ?? model.model;
});

// Resolve a node tool's display name (" Tool" suffix
// stripped) so same-node-type tools can group into "N {NodeType}". Returns
// undefined when the node type isn't loaded, leaving the tool as an individual
// humanized chip.
function resolveNodeTypeLabel(nodeType: string, version?: number): string | undefined {
	return nodeTypesStore.getNodeType(nodeType, version)?.displayName.replace(/ Tool$/, '');
}

const chips = computed(() =>
	summary.value ? buildAgentCardChips(summary.value, resolveNodeTypeLabel) : [],
);

// The picker is NDV-parameter-input shaped; it only reads `parameter.name`, so a
// minimal synthesized definition matching the node's `agentId` property is enough.
const agentSelectorParameter: INodeProperties = {
	displayName: i18n.baseText('agentNode.card.defaultName'),
	name: 'agentId',
	type: 'agentSelector',
	default: { __rl: true, mode: 'list', value: '' },
};

function onPickAgent(value: INodeParameterResourceLocator) {
	emit('update', { agentId: value });
}

function onActivate(event: MouseEvent) {
	if (isConfigured.value) {
		emit('activate', id.value, event);
	}
}

function onOpenContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

function openAgent() {
	if (!isConfigured.value || !projectId.value) return;

	// No origin node id: this trip starts from the canvas, so "Back to
	// workflow" must land on the canvas — a set node id would reopen the
	// node's NDV on return (that's the NDV banner's round-trip, not ours).
	void nav.openBuilder(projectId.value, agentId.value);
}

// Resolve the friendly model name once the project scope is known. projectId is
// often empty at mount and resolves async, so watch it (immediate) rather than
// firing once in onMounted, which would skip the load on a cold canvas and leave
// the model name on its raw-id fallback.
watch(
	projectId,
	(id) => {
		if (!id) return;
		void ensureModelsLoaded(id).catch(() => {});
	},
	{ immediate: true },
);
</script>

<template>
	<div
		:class="[$style.card, classes]"
		data-test-id="canvas-node-agent"
		@dblclick.stop="onActivate"
		@contextmenu="onOpenContextMenu"
	>
		<div :class="$style.surface">
			<header :class="$style.header">
				<div :class="$style.headerLabel">
					<N8nIcon icon="bot" :size="20" :class="$style.agentIcon" />
					<N8nText :bold="true" :class="$style.name">{{ agentName }}</N8nText>
				</div>
				<N8nTooltip
					v-if="isConfigured"
					:content="i18n.baseText('agentNode.card.openAgent')"
					placement="top"
				>
					<button
						type="button"
						:class="[$style.openButton, 'nodrag']"
						:aria-label="i18n.baseText('agentNode.card.openAgent')"
						data-test-id="canvas-node-agent-open"
						@click="openAgent"
					>
						<N8nIcon icon="arrow-right" :size="16" />
					</button>
				</N8nTooltip>
			</header>

			<div :class="$style.bodyWrap">
				<div :class="$style.body">
					<template v-if="isConfigured">
						<N8nText v-if="hasError" size="small" color="danger">
							{{ i18n.baseText('agentNode.card.loadError') }}
						</N8nText>
						<template v-else>
							<div :class="$style.modelRow" data-test-id="canvas-node-agent-model">
								<CredentialIcon
									v-if="modelCredentialType"
									:credential-type-name="modelCredentialType"
									:size="16"
								/>
								<N8nText
									size="small"
									:class="[$style.modelName, { [$style.modelPlaceholder]: !modelName }]"
								>
									{{ modelName || i18n.baseText('agentNode.card.noModel') }}
								</N8nText>
							</div>
							<CanvasNodeAgentChips v-if="chips.length" :chips="chips" />
						</template>
					</template>
					<div v-else :class="[$style.picker, 'nodrag', 'nowheel']">
						<AgentSelectorParameterInput
							:parameter="agentSelectorParameter"
							:model-value="agentResourceLocator"
							path="parameters.agentId"
							:is-read-only="isReadOnly"
							input-size="medium"
							hide-mode-selector
							@update:model-value="onPickAgent"
						/>
					</div>
				</div>
			</div>
		</div>

		<CanvasNodeStatusIcons :class="$style.statusIcons" />
	</div>
</template>

<style lang="scss" module>
@use './_canvasNodeStyles.scss' as styles;

.card {
	--agent-card--border-color: var(--border-color);
	--agent-card--header-dot-color: var(--border-color);
	--agent-card--radius: 12px;

	position: relative;
	// Own stacking context so the header/body/glow z-indexes below stay local and
	// never compete with the connection handles (which must stay on top).
	isolation: isolate;
	width: 384px;
	border-radius: var(--agent-card--radius);
}

.surface {
	// Transparent layout wrapper only — the header and body each carry their own
	// border so the body's rounded top corners miter cleanly
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	// Extra bottom padding: the body overlaps up into it by one radius so its
	// rounded top sits on the dotted header.
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--lg);
	border: 2px solid var(--agent-card--border-color);
	border-radius: var(--agent-card--radius) var(--agent-card--radius) 0 0;

	// Solid surface base + a dot grid,
	// faded toward the left/right edges by a surface sheen
	background-color: var(--background--surface);
	background-image:
		linear-gradient(
			89deg,
			var(--background--surface) 6.35%,
			color-mix(in srgb, var(--background--surface) 19%, transparent) 26.93%,
			color-mix(in srgb, var(--background--surface) 6%, transparent) 69.71%,
			var(--background--surface) 90.29%
		),
		// square dot pattern
		conic-gradient(
				from 0deg at 2px 2px,
				transparent 75%,
				var(--agent-card--header-dot-color) 75% 100%
			),
		// another (offset) square dot pattern
		conic-gradient(
				from 0deg at 2px 2px,
				transparent 75%,
				var(--agent-card--header-dot-color) 75% 100%
			);
	background-position:
		0 0,
		0 0,
		8px 4px;
	background-repeat: no-repeat, repeat, repeat;
	background-size:
		100% 100%,
		16px 8px,
		16px 8px;
}

.headerLabel {
	display: flex;
	flex: 1;
	min-width: 0;
	align-items: center;
	gap: var(--spacing--2xs);
}

.agentIcon {
	flex-shrink: 0;
	color: var(--text-color);
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color);
}

.openButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: var(--spacing--4xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	color: var(--canvas--label--color);
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
		color: var(--text-color);
	}
}

// Stacking context that sits above the header (which stays in normal flow, so
// its arrow button keeps its clicks + hover), and tucks the body up into the
// header by one radius.
.bodyWrap {
	position: relative;
	z-index: 1;
	margin-top: calc(-1 * var(--agent-card--radius));
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: 2px solid var(--agent-card--border-color);
	border-radius: var(--agent-card--radius);
	background: var(--background--surface);
}

.modelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.modelName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtle);
}

.modelPlaceholder {
	// Dimmer than a real model name to read as an empty/placeholder state.
	color: var(--text-color--subtler);
}

.picker {
	width: 100%;
}

.statusIcons {
	// Above .bodyWrap (z-index 1) so the status check/spinner shows over the body.
	position: absolute;
	z-index: 2;
	bottom: var(--spacing--2xs);
	right: var(--spacing--2xs);
}

/**
 * Execution state — mirrors CanvasNodeDefault: the status sits on the node
 * outline rather than wrapping it. The card outline is drawn by two elements
 * (header + body) whose overlap seam would show if their borders were tinted,
 * so success/error paint one 2px ring exactly over the outer border instead;
 * running/waiting keep the default-node animated glow around the card.
 */
.selected {
	box-shadow: 0 0 0 4px var(--canvas--color--selected);
}

.success::after,
.error::after {
	content: '';
	position: absolute;
	inset: 0;
	z-index: 2;
	border: 2px solid;
	border-radius: var(--agent-card--radius);
	pointer-events: none;
}

.success::after {
	border-color: var(--color-canvas-node-success-border-color, var(--color--success));
}

.error::after {
	border-color: var(--canvas-node--border-color--error, var(--color--danger));
}

/* stylelint-disable */
.running::after,
.waiting::after {
	@include styles.status-animated-after;
	// success/error can apply at the same time (e.g. a succeeded node waiting
	// for its next run) — drop their 2px ring border while the glow shows.
	border: none;
	border-radius: calc(var(--agent-card--radius) + 3px);
}

.running::after {
	@include styles.status-running-animation;
}
.waiting::after {
	@include styles.status-waiting-animation;
}

@include styles.status-animation-definitions;
/* stylelint-enable */
</style>
