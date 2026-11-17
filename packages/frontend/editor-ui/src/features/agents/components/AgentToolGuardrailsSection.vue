<script setup lang="ts">
import type {
	AgentConfigValidationIssue,
	AgentToolGuardrailConfig,
	AgentToolGuardrailKind,
} from '@n8n/api-types';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';

import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import type { AgentJsonToolRef } from '../types';
import {
	guardrailKindLabelKey,
	guardrailNamesTool,
	TOOL_GUARDRAIL_KINDS,
} from '../utils/guardrails';
import AgentChipButton from './AgentChipButton.vue';
import AgentGuardrailModal from './AgentGuardrailModal.vue';

/**
 * Guardrails wiring for a tool-config modal. Getters keep the chips live: a
 * guardrail saved from this modal flows straight into the host's config and
 * back into the list without reopening the tool.
 */
export interface ToolGuardrailsWiring {
	getGuardrails: () => AgentToolGuardrailConfig[];
	getTools: () => AgentJsonToolRef[];
	onUpdateGuardrails: (tools: AgentToolGuardrailConfig[]) => void;
	validationIssues?: MaybeRefOrGetter<AgentConfigValidationIssue[]>;
}

const props = defineProps<{
	toolRef: AgentJsonToolRef;
	getGuardrails: () => AgentToolGuardrailConfig[];
	getTools: () => AgentJsonToolRef[];
	onUpdateGuardrails: (tools: AgentToolGuardrailConfig[]) => void;
	validationIssues?: MaybeRefOrGetter<AgentConfigValidationIssue[]>;
}>();

const i18n = useI18n();

const guardrails = computed(() => props.getGuardrails());
/** Guardrails that name this tool in their `tools` list. */
const toolGuardrails = computed(() =>
	guardrails.value.filter((guardrail) => guardrailNamesTool(guardrail, props.toolRef)),
);
/** Guardrails without a `tools` list cover this tool too, but are not specific to it. */
const wildcardGuardrails = computed(() => guardrails.value.filter((guardrail) => !guardrail.tools));

const { groupIssueMessages } = useAgentCapabilityIssueMessages(
	() => toValue(props.validationIssues) ?? [],
);
const guardrailIssueMessages = computed(() =>
	groupIssueMessages('guardrail', (issue) => issue.capability.id),
);

const modalOpen = ref(false);
const createKind = ref<AgentToolGuardrailKind>('keywords');

const addItems = computed(() =>
	TOOL_GUARDRAIL_KINDS.map((kind) => ({
		id: kind,
		label: i18n.baseText(guardrailKindLabelKey(kind)),
		testId: `agent-tool-guardrails-add-${kind}`,
	})),
);

const addLabel = computed(() => i18n.baseText('agents.builder.guardrails.add'));
const hasChips = computed(() => toolGuardrails.value.length + wildcardGuardrails.value.length > 0);

function kindLabel(guardrail: AgentToolGuardrailConfig): string {
	return i18n.baseText(guardrailKindLabelKey(guardrail.kind));
}

/** Translated as one string, so a locale can reorder the chip metadata. */
function metaKind(guardrail: AgentToolGuardrailConfig): string {
	return i18n.baseText('agents.builder.guardrails.chip.metaKind', {
		interpolate: { kind: kindLabel(guardrail) },
	});
}

function metaWithTools(guardrail: AgentToolGuardrailConfig, tools: string): string {
	return i18n.baseText('agents.builder.guardrails.chip.metaTools', {
		interpolate: { kind: kindLabel(guardrail), tools },
	});
}

function issueReasons(guardrail: AgentToolGuardrailConfig): string[] {
	return guardrailIssueMessages.value.get(guardrail.id) ?? [];
}

function onAddSelect(kind: string) {
	createKind.value = kind as AgentToolGuardrailKind;
	modalOpen.value = true;
}

function onModalSave(guardrail: AgentToolGuardrailConfig) {
	props.onUpdateGuardrails([...guardrails.value, guardrail]);
}
</script>

<template>
	<div :class="$style.section" data-testid="agent-tool-guardrails-section">
		<div :class="$style.heading">
			<N8nText bold>{{ i18n.baseText('agents.builder.guardrails.title') }}</N8nText>
			<N8nText size="small" :class="$style.description">
				{{ i18n.baseText('agents.builder.guardrails.description') }}
			</N8nText>
		</div>
		<div :class="$style.box" data-testid="agent-tool-guardrails-chips">
			<div :class="$style.chips">
				<!-- View-only for now: the chips show what covers this tool; the +
				     below is the only way in to the guardrail modal. -->
				<div v-for="guardrail in toolGuardrails" :key="guardrail.id" :class="$style.chipGroup">
					<AgentChipButton
						disabled
						:invalid="issueReasons(guardrail).length > 0"
						:invalid-reasons="issueReasons(guardrail)"
						data-testid="agent-tool-guardrails-chip"
					>
						<span :class="$style.chipLabel">
							<span :class="$style.chipName">{{ guardrail.name ?? guardrail.id }}</span>
							<span :class="$style.chipMeta">{{ metaKind(guardrail) }}</span>
						</span>
					</AgentChipButton>
				</div>
				<div v-for="guardrail in wildcardGuardrails" :key="guardrail.id" :class="$style.chipGroup">
					<AgentChipButton
						disabled
						icon="globe"
						:invalid="issueReasons(guardrail).length > 0"
						:invalid-reasons="issueReasons(guardrail)"
						data-testid="agent-tool-guardrails-wildcard-chip"
					>
						<span :class="$style.chipLabel">
							<span :class="$style.chipName">{{ guardrail.name ?? guardrail.id }}</span>
							<span :class="$style.chipMeta">
								{{
									metaWithTools(guardrail, i18n.baseText('agents.builder.guardrails.chip.allTools'))
								}}
							</span>
						</span>
					</AgentChipButton>
				</div>

				<N8nDropdownMenu
					:items="addItems"
					placement="bottom-start"
					data-testid="agent-tool-guardrails-add-menu"
					@select="onAddSelect"
				>
					<template #trigger>
						<N8nTooltip v-if="hasChips" as-child :content="addLabel" placement="top">
							<N8nButton
								variant="ghost"
								size="medium"
								icon-only
								:aria-label="addLabel"
								data-testid="agent-tool-guardrails-add"
							>
								<template #icon>
									<N8nIcon icon="plus" :size="16" color="text-light" />
								</template>
							</N8nButton>
						</N8nTooltip>
						<N8nButton
							v-else
							:class="$style.emptyAddButton"
							variant="ghost"
							size="medium"
							:aria-label="addLabel"
							data-testid="agent-tool-guardrails-add"
						>
							<template #icon>
								<N8nIcon icon="plus" :size="16" />
							</template>
							{{ addLabel }}
						</N8nButton>
					</template>
				</N8nDropdownMenu>
			</div>
		</div>

		<AgentGuardrailModal
			:open="modalOpen"
			:guardrail="null"
			:kind="createKind"
			:tools="getTools()"
			:existing-ids="guardrails.map((guardrail) => guardrail.id)"
			@update:open="modalOpen = $event"
			@save="onModalSave"
		/>
	</div>
</template>

<style module lang="scss">
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.description {
	color: var(--text-color--subtler);
}

.box {
	display: flex;
	padding: var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius--md);
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
	width: 100%;
}

.chipGroup {
	display: inline-flex;
	align-items: center;
	flex-wrap: nowrap;
	min-width: 0;
	max-width: min(var(--spacing--5xl), 100%);

	> button {
		width: 100%;
	}
}

.chipLabel {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
	min-width: 0;
	max-width: 100%;
}

.chipName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chipMeta {
	flex-shrink: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--normal);
	white-space: nowrap;
}

.emptyAddButton {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));
	margin-top: calc(-1 * var(--spacing--4xs));

	&:hover {
		--button--color: var(--text-color);
		background-color: transparent;
	}
}
</style>
