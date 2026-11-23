<script setup lang="ts">
import type {
	AgentConfigValidationIssue,
	AgentToolGuardrailConfig,
	AgentToolGuardrailKind,
} from '@n8n/api-types';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, toValue, withDefaults, type MaybeRefOrGetter } from 'vue';

import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import type { AgentJsonToolRef } from '../types';
import {
	guardrailKindLabelKey,
	guardrailNamesTool,
	TOOL_GUARDRAIL_KINDS,
} from '../utils/guardrails';
import AgentChipButton from './AgentChipButton.vue';

/**
 * What the host needs to open the guardrail modal that replaces this one.
 * `guardrail` null means create, with `kind` preselected.
 */
export interface OpenGuardrailRequest {
	guardrail: AgentToolGuardrailConfig | null;
	kind?: AgentToolGuardrailKind;
}

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
	disabled?: MaybeRefOrGetter<boolean>;
}

const props = withDefaults(
	defineProps<{
		toolRef: AgentJsonToolRef;
		getGuardrails: () => AgentToolGuardrailConfig[];
		getTools: () => AgentJsonToolRef[];
		onUpdateGuardrails: (tools: AgentToolGuardrailConfig[]) => void;
		validationIssues?: MaybeRefOrGetter<AgentConfigValidationIssue[]>;
		disabled?: MaybeRefOrGetter<boolean>;
	}>(),
	{
		disabled: false,
	},
);

const emit = defineEmits<{
	'open-guardrail': [request: OpenGuardrailRequest];
}>();

const i18n = useI18n();

/** Live, so a lock that starts while the modal is open still locks the section. */
const isDisabled = computed(() => toValue(props.disabled));

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

const addItems = computed(() =>
	TOOL_GUARDRAIL_KINDS.map((kind) => ({
		id: kind,
		label: i18n.baseText(guardrailKindLabelKey(kind)),
		testId: `agent-tool-guardrails-add-${kind}`,
	})),
);

const addLabel = computed(() => i18n.baseText('agents.builder.guardrails.add'));
const hasChips = computed(() => toolGuardrails.value.length + wildcardGuardrails.value.length > 0);

function issueReasons(guardrail: AgentToolGuardrailConfig): string[] {
	return guardrailIssueMessages.value.get(guardrail.id) ?? [];
}

function onAddSelect(kind: string) {
	if (isDisabled.value) return;
	emit('open-guardrail', { guardrail: null, kind: kind as AgentToolGuardrailKind });
}

function onOpenGuardrail(guardrail: AgentToolGuardrailConfig) {
	if (isDisabled.value) return;
	emit('open-guardrail', { guardrail });
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
				<div v-for="guardrail in toolGuardrails" :key="guardrail.id" :class="$style.chipGroup">
					<AgentChipButton
						:disabled="isDisabled"
						:invalid="issueReasons(guardrail).length > 0"
						:invalid-reasons="issueReasons(guardrail)"
						data-testid="agent-tool-guardrails-chip"
						@click="onOpenGuardrail(guardrail)"
					>
						<span :class="$style.chipLabel">
							<span :class="$style.chipName">{{ guardrail.name ?? guardrail.id }}</span>
						</span>
					</AgentChipButton>
				</div>
				<div v-for="guardrail in wildcardGuardrails" :key="guardrail.id" :class="$style.chipGroup">
					<AgentChipButton
						:disabled="isDisabled"
						:invalid="issueReasons(guardrail).length > 0"
						:invalid-reasons="issueReasons(guardrail)"
						data-testid="agent-tool-guardrails-wildcard-chip"
						@click="onOpenGuardrail(guardrail)"
					>
						<span :class="$style.chipLabel">
							<span :class="$style.chipName">{{ guardrail.name ?? guardrail.id }}</span>
							<span :class="$style.chipMeta">
								· {{ i18n.baseText('agents.builder.guardrails.chip.allTools') }}
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
								:disabled="isDisabled"
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
							:disabled="isDisabled"
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
