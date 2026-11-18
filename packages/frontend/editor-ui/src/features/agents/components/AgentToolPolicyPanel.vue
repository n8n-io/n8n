<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	DEFAULT_TOOL_POLICY_DENY_MESSAGE,
	TOOL_POLICY_MAX_RULES,
	TOOL_POLICY_MESSAGE_MAX_LENGTH,
	TOOL_POLICY_NAME_MAX_LENGTH,
	TOOL_POLICY_TEMPLATE_NAMES,
	type ToolPolicyTemplate,
	type ToolPolicyAction,
	type ToolPolicySelector,
} from '@n8n/api-types';
import {
	N8nActionDropdown,
	N8nButton,
	N8nCallout,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nIcon,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mcpServerToNode } from '../composables/useMcpServerAdapter';
import type { AgentJsonConfig, AgentJsonMcpServerConfig } from '../types';
import {
	applyToolPolicyTemplate,
	blocksAllToolsAtStart,
	buildToolPolicyOptions,
	fromToolPolicyDraft,
	isSameToolPolicy,
	isToolPolicyRuleComplete,
	missingToolSelectors,
	needsToolUsed,
	nextToolPolicyRuleId,
	overlappingTools,
	toolPolicySave,
	toolPolicySelectorKey,
	toToolPolicyDraft,
	type ToolPolicyAppliesMode,
	type ToolPolicyDraft,
	type ToolPolicyOptionSource,
	type ToolPolicyRuleDraft,
} from '../utils/tool-policy-config';
import {
	coveredAgentTools,
	toolPolicyChips,
	type ToolPickerOption,
} from '../utils/tool-policy-picker';
import AgentPanel from './AgentPanel.vue';
import AgentToolPolicyChips from './AgentToolPolicyChips.vue';
import AgentToolPolicyToolField from './AgentToolPolicyToolField.vue';
import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		disabled?: boolean;
		projectId?: string;
	}>(),
	{ disabled: false, projectId: undefined },
);

const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const savedPolicy = computed(() => props.config?.config?.guardrails?.toolPolicy);
const draft = ref<ToolPolicyDraft>(toToolPolicyDraft(savedPolicy.value));

// Keep local edits, such as a rule with no tools yet, unless the saved policy
// changed from somewhere else.
watch(savedPolicy, (policy) => {
	if (!isSameToolPolicy(policy, draft.value)) draft.value = toToolPolicyDraft(policy);
});

/** Applies a change to the draft and saves the result. A disabled panel ignores changes. */
function edit(change: () => void) {
	if (props.disabled) return;
	change();
	if (isSameToolPolicy(savedPolicy.value, draft.value)) return;
	emit('update:config', toolPolicySave(props.config, fromToolPolicyDraft(draft.value)));
}

/** The tool names of each MCP server whose list is loaded, by server name. */
const mcpServerTools = ref<Record<string, string[]>>({});
/** The servers whose list is loading or did not load. */
const mcpServerStates = ref<Record<string, 'loading' | 'failed'>>({});

function setServerState(name: string, state?: 'loading' | 'failed') {
	const { [name]: _, ...rest } = mcpServerStates.value;
	mcpServerStates.value = state ? { ...rest, [name]: state } : rest;
}

/**
 * Asks an MCP server for its tools, the same way as the approval setting of an MCP tool. A
 * server that does not answer keeps its one option for all of its tools.
 */
async function loadMcpServerTools(server: AgentJsonMcpServerConfig) {
	const nodeType =
		nodeTypesStore.getNodeType(server.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE) ??
		nodeTypesStore.getNodeType(AI_MCP_TOOL_NODE_TYPE);
	if (!nodeType) return;

	const node = mcpServerToNode(server, nodeType);
	setServerState(server.name, 'loading');
	try {
		const tools = await nodeTypesStore.getNodeParameterOptions({
			nodeTypeAndVersion: { name: node.type, version: node.typeVersion },
			path: 'parameters.includeTools',
			methodName: 'getTools',
			currentNodeParameters: node.parameters,
			credentials: node.credentials,
			projectId: props.projectId,
		});
		mcpServerTools.value = {
			...mcpServerTools.value,
			[server.name]: tools.map((tool) => String(tool.value)),
		};
		setServerState(server.name);
	} catch {
		// Rules for the whole server still work, and a saved rule for one tool stays selected.
		setServerState(server.name, 'failed');
	}
}

function retryMcpServerTools(serverName: string) {
	const server = props.config?.mcpServers?.find((candidate) => candidate.name === serverName);
	if (server) void loadMcpServerTools(server);
}

// When the panel opens, and when the builder adds or changes a server.
watch(
	() =>
		(props.config?.mcpServers ?? []).map((server) => `${server.name}\n${server.url}`).join('\n'),
	() => {
		for (const server of props.config?.mcpServers ?? []) void loadMcpServerTools(server);
	},
	{ immediate: true },
);

const options = computed(() => buildToolPolicyOptions(props.config, mcpServerTools.value));

function sourceLabel(source: ToolPolicyOptionSource): string {
	switch (source.type) {
		case 'node':
			return source.name;
		case 'workflow':
			return i18n.baseText('agents.toolPolicy.selector.workflow', {
				interpolate: { name: source.name },
			});
		case 'mcpServer':
			return i18n.baseText('agents.toolPolicy.selector.mcpServer', {
				interpolate: { name: source.name },
			});
		case 'mcpTool':
			return i18n.baseText('agents.toolPolicy.selector.mcpTool', {
				interpolate: { tool: source.tool, server: source.server },
			});
		case 'nodeType':
			return i18n.baseText('agents.toolPolicy.selector.nodeType', {
				interpolate: {
					name: nodeTypesStore.getNodeType(source.nodeType)?.displayName ?? source.nodeType,
				},
			});
		case 'category':
			return i18n.baseText(`agents.toolPolicy.category.${source.category}` as BaseTextKey);
	}
}

/** A label for a saved selector that is not in the options. */
function fallbackLabel(selector: ToolPolicySelector): string {
	if (selector.kind === 'package') {
		return i18n.baseText('agents.toolPolicy.selector.package', {
			interpolate: { name: selector.value },
		});
	}
	if (selector.kind === 'nodeType')
		return sourceLabel({ type: 'nodeType', nodeType: selector.value });
	if (selector.kind === 'category')
		return sourceLabel({ type: 'category', category: selector.value });
	const { ref } = selector;
	// The list of the server is not loaded. The server is still there, so the tool is not removed.
	if (
		ref.type === 'mcpServer' &&
		ref.tool !== undefined &&
		(props.config?.mcpServers ?? []).some((server) => server.name === ref.name)
	) {
		return sourceLabel({ type: 'mcpTool', server: ref.name, tool: ref.tool });
	}
	return i18n.baseText('agents.toolPolicy.selector.missing', {
		interpolate: { name: ref.type === 'workflow' ? ref.workflowId : ref.name },
	});
}

/** The agent options, plus the selected ones that the agent no longer has. */
function selectOptions(selected: ToolPolicySelector[]): ToolPickerOption[] {
	const list: ToolPickerOption[] = options.value.map((option) => ({
		key: option.key,
		label: sourceLabel(option.source),
		selector: option.selector,
		source: option.source,
	}));
	for (const selector of selected) {
		const key = toolPolicySelectorKey(selector);
		if (!list.some((option) => option.key === key)) {
			list.push({ key, label: fallbackLabel(selector), selector });
		}
	}
	return list;
}

function toSelectors(keys: unknown, selected: ToolPolicySelector[]): ToolPolicySelector[] {
	if (!Array.isArray(keys)) return [];
	const byKey = new Map(selectOptions(selected).map((option) => [option.key, option.selector]));
	return keys.flatMap((key) => {
		const selector = typeof key === 'string' ? byKey.get(key) : undefined;
		return selector ? [selector] : [];
	});
}

const actionOptions = computed<Array<{ value: ToolPolicyAction; label: string }>>(() => [
	{ value: 'allow', label: i18n.baseText('agents.toolPolicy.action.allow') },
	{ value: 'deny', label: i18n.baseText('agents.toolPolicy.action.deny') },
]);

// The rule reads as a sentence, so these are its connecting words.
const appliesOptions = computed<Array<{ value: ToolPolicyAppliesMode; label: string }>>(() => [
	{ value: 'always', label: i18n.baseText('agents.toolPolicy.applies.always') },
	{ value: 'after', label: i18n.baseText('agents.toolPolicy.applies.after') },
	{ value: 'afterAll', label: i18n.baseText('agents.toolPolicy.applies.afterAll') },
]);

function appliesLabel(applies: ToolPolicyAppliesMode): string {
	return appliesOptions.value.find((option) => option.value === applies)?.label ?? '';
}

/** The words after the used tools: "was used" or "were used". */
function appliesTail(applies: ToolPolicyAppliesMode): string {
	return i18n.baseText(
		applies === 'afterAll'
			? 'agents.toolPolicy.applies.afterAll.tail'
			: 'agents.toolPolicy.applies.after.tail',
	);
}

function actionLabel(action: ToolPolicyAction): string {
	return i18n.baseText(`agents.toolPolicy.action.${action}`);
}

/** The rules that the builder collapsed to one line. */
const collapsedRuleIds = ref<string[]>([]);

function toggleRule(rule: ToolPolicyRuleDraft) {
	collapsedRuleIds.value = collapsedRuleIds.value.includes(rule.id)
		? collapsedRuleIds.value.filter((id) => id !== rule.id)
		: [...collapsedRuleIds.value, rule.id];
}

function chipsOf(selectors: ToolPolicySelector[]) {
	return toolPolicyChips(selectors.map(toolPolicySelectorKey), selectOptions(selectors));
}

/** Which tools of this agent a tool field covers. Empty while nothing is selected. */
function coversText(selectors: ToolPolicySelector[]): string {
	if (selectors.length === 0) return '';
	const covered = coveredAgentTools(props.config, selectors);
	if (covered.length === 0) return i18n.baseText('agents.toolPolicy.rule.covers.none');
	return i18n.baseText('agents.toolPolicy.rule.covers', {
		adjustToNumber: covered.length,
		interpolate: { count: covered.length, tools: covered.join(', ') },
	});
}

function isAction(value: unknown): value is ToolPolicyAction {
	return value === 'allow' || value === 'deny';
}

function onDefaultAction(value: unknown) {
	if (!isAction(value)) return;
	edit(() => (draft.value.defaultAction = value));
}

function onRuleAction(rule: ToolPolicyRuleDraft, value: unknown) {
	if (!isAction(value)) return;
	edit(() => (rule.action = value));
}

function onRuleApplies(rule: ToolPolicyRuleDraft, value: unknown) {
	if (value !== 'always' && value !== 'after' && value !== 'afterAll') return;
	edit(() => (rule.applies = value));
}

function onRuleTools(rule: ToolPolicyRuleDraft, keys: unknown) {
	edit(() => (rule.tools = toSelectors(keys, rule.tools)));
}

function onRuleToolUsed(rule: ToolPolicyRuleDraft, keys: unknown) {
	edit(() => (rule.toolUsed = toSelectors(keys, rule.toolUsed)));
}

function onRuleMessage(rule: ToolPolicyRuleDraft, value: string) {
	edit(() => (rule.message = value));
}

function addRule() {
	if (props.disabled) return;
	draft.value.rules.push({
		id: nextToolPolicyRuleId(draft.value.rules),
		name: '',
		action: 'deny',
		tools: [],
		applies: 'after',
		toolUsed: [],
		message: '',
	});
}

function removeRule(index: number) {
	edit(() => draft.value.rules.splice(index, 1));
}

const templateItems = computed<Array<ActionDropdownItem<ToolPolicyTemplate>>>(() =>
	TOOL_POLICY_TEMPLATE_NAMES.map((template) => ({
		id: template,
		label: i18n.baseText(`agents.toolPolicy.template.${template}` as BaseTextKey),
		disabled: !canAddRule.value,
	})),
);

function applyTemplate(template: ToolPolicyTemplate) {
	edit(() => (draft.value = applyToolPolicyTemplate(draft.value, template)));
}

const canAddRule = computed(
	() => !props.disabled && draft.value.rules.length < TOOL_POLICY_MAX_RULES,
);
const startWarning = computed(() => blocksAllToolsAtStart(draft.value));

function ruleWarnings(rule: ToolPolicyRuleDraft): Array<{ key: string; text: string }> {
	const warnings: Array<{ key: string; text: string }> = [];
	const missing = missingToolSelectors(props.config, rule);
	if (missing.length > 0) {
		warnings.push({
			key: 'missing',
			text: i18n.baseText('agents.toolPolicy.rule.warning.missingTools', {
				interpolate: { tools: missing.map(fallbackLabel).join(', ') },
			}),
		});
	}
	const overlap = overlappingTools(props.config, rule);
	if (overlap.length > 0) {
		warnings.push({
			key: 'overlap',
			text: i18n.baseText('agents.toolPolicy.rule.warning.overlap', {
				interpolate: { tools: overlap.join(', ') },
			}),
		});
	}
	return warnings;
}
</script>

<template>
	<AgentPanel
		:header="i18n.baseText('agents.toolPolicy.title')"
		:description="i18n.baseText('agents.toolPolicy.description')"
		data-testid="agent-tool-policy-panel"
	>
		<div :class="[disabled && shared.disabled, $style.body]">
			<div :class="shared.settingRow">
				<div :class="shared.settingLabel">
					<N8nText step="sm" bold :class="shared.dataEntryLabel">
						{{ i18n.baseText('agents.toolPolicy.defaultAction.label') }}
					</N8nText>
					<N8nText size="small" :class="shared.dataEntrySubLabel">
						{{ i18n.baseText('agents.toolPolicy.defaultAction.hint') }}
					</N8nText>
				</div>
				<N8nSelect
					:model-value="draft.defaultAction"
					size="small"
					:disabled="disabled"
					:class="shared.settingControlShort"
					data-testid="agent-tool-policy-default-action"
					@update:model-value="onDefaultAction"
				>
					<N8nOption
						v-for="option in actionOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
			</div>

			<N8nCallout
				v-if="startWarning"
				theme="warning"
				slim
				data-testid="agent-tool-policy-start-warning"
			>
				{{ i18n.baseText('agents.toolPolicy.warning.noToolAtStart') }}
			</N8nCallout>

			<N8nText
				v-if="draft.rules.length === 0"
				size="small"
				:class="shared.dataEntrySubLabel"
				data-testid="agent-tool-policy-empty"
			>
				{{ i18n.baseText('agents.toolPolicy.rules.empty') }}
			</N8nText>

			<div
				v-for="(rule, index) in draft.rules"
				:key="rule.id"
				:class="$style.rule"
				data-testid="agent-tool-policy-rule"
			>
				<div :class="$style.ruleHeader">
					<button
						type="button"
						:class="$style.ruleToggle"
						:aria-expanded="!collapsedRuleIds.includes(rule.id)"
						:aria-label="i18n.baseText('agents.toolPolicy.rule.toggle')"
						data-testid="agent-tool-policy-rule-toggle"
						@click="toggleRule(rule)"
					>
						<N8nIcon
							:icon="collapsedRuleIds.includes(rule.id) ? 'chevron-right' : 'chevron-down'"
							size="small"
						/>
					</button>
					<N8nInlineTextEdit
						:model-value="rule.name"
						:placeholder="
							i18n.baseText('agents.toolPolicy.rule.title', {
								interpolate: { index: String(index + 1) },
							})
						"
						:max-length="TOOL_POLICY_NAME_MAX_LENGTH"
						max-width="100%"
						:disabled="disabled"
						:class="[shared.dataEntryLabel, $style.ruleName]"
						data-testid="agent-tool-policy-rule-name"
						@update:model-value="(value: string) => edit(() => (rule.name = value))"
					/>
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						size="small"
						:disabled="disabled"
						:aria-label="i18n.baseText('agents.toolPolicy.rule.remove')"
						data-testid="agent-tool-policy-rule-remove"
						@click="removeRule(index)"
					/>
				</div>

				<!-- One line that reads like the rule, for a collapsed rule. -->
				<div
					v-if="collapsedRuleIds.includes(rule.id)"
					:class="$style.summary"
					data-testid="agent-tool-policy-rule-summary"
				>
					<span :class="[$style.action, rule.action === 'deny' && $style.actionDeny]">
						{{ actionLabel(rule.action) }}
					</span>
					<AgentToolPolicyChips :chips="chipsOf(rule.tools)" />
					<template v-if="rule.applies !== 'advanced'">
						<span :class="$style.words">{{ appliesLabel(rule.applies) }}</span>
						<template v-if="needsToolUsed(rule.applies)">
							<AgentToolPolicyChips :chips="chipsOf(rule.toolUsed)" />
							<span :class="$style.words">{{ appliesTail(rule.applies) }}</span>
						</template>
					</template>
				</div>

				<template v-else>
					<div :class="$style.line">
						<N8nSelect
							:model-value="rule.action"
							size="small"
							:disabled="disabled"
							:class="$style.word"
							data-testid="agent-tool-policy-rule-action"
							@update:model-value="onRuleAction(rule, $event)"
						>
							<N8nOption
								v-for="option in actionOptions"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>
						<AgentToolPolicyToolField
							:model-value="rule.tools.map(toolPolicySelectorKey)"
							:options="selectOptions(rule.tools)"
							:server-states="mcpServerStates"
							:disabled="disabled"
							data-testid="agent-tool-policy-rule-tools"
							@update:model-value="onRuleTools(rule, $event)"
							@retry="retryMcpServerTools"
						/>
					</div>
					<N8nText
						v-if="coversText(rule.tools)"
						size="small"
						:class="[shared.dataEntrySubLabel, $style.covers]"
						data-testid="agent-tool-policy-rule-covers"
					>
						{{ coversText(rule.tools) }}
					</N8nText>

					<div :class="$style.line">
						<N8nText
							v-if="rule.applies === 'advanced'"
							size="small"
							:class="shared.dataEntrySubLabel"
							data-testid="agent-tool-policy-rule-advanced"
						>
							{{ i18n.baseText('agents.toolPolicy.applies.advanced') }}
						</N8nText>
						<N8nSelect
							v-else
							:model-value="rule.applies"
							size="small"
							:disabled="disabled"
							:class="$style.wordWide"
							data-testid="agent-tool-policy-rule-applies"
							@update:model-value="onRuleApplies(rule, $event)"
						>
							<N8nOption
								v-for="option in appliesOptions"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>
						<template v-if="needsToolUsed(rule.applies)">
							<AgentToolPolicyToolField
								:model-value="rule.toolUsed.map(toolPolicySelectorKey)"
								:options="selectOptions(rule.toolUsed)"
								:server-states="mcpServerStates"
								:disabled="disabled"
								data-testid="agent-tool-policy-rule-tool-used"
								@update:model-value="onRuleToolUsed(rule, $event)"
								@retry="retryMcpServerTools"
							/>
							<span :class="[$style.words, $style.tail]">{{ appliesTail(rule.applies) }}</span>
						</template>
					</div>
					<N8nText
						v-if="needsToolUsed(rule.applies) && coversText(rule.toolUsed)"
						size="small"
						:class="[shared.dataEntrySubLabel, $style.covers]"
						data-testid="agent-tool-policy-rule-used-covers"
					>
						{{ coversText(rule.toolUsed) }}
					</N8nText>

					<div v-if="rule.action === 'deny'" :class="$style.message">
						<N8nText step="sm" :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.toolPolicy.rule.message.label') }}
						</N8nText>
						<N8nInput
							:model-value="rule.message"
							size="small"
							:disabled="disabled"
							:maxlength="TOOL_POLICY_MESSAGE_MAX_LENGTH"
							:placeholder="DEFAULT_TOOL_POLICY_DENY_MESSAGE"
							data-testid="agent-tool-policy-rule-message"
							@update:model-value="onRuleMessage(rule, String($event ?? ''))"
						/>
						<N8nText size="small" :class="shared.dataEntrySubLabel">
							{{ i18n.baseText('agents.toolPolicy.rule.message.hint') }}
						</N8nText>
					</div>
				</template>

				<N8nText
					v-if="!isToolPolicyRuleComplete(rule)"
					size="small"
					:class="shared.dataEntrySubLabel"
					data-testid="agent-tool-policy-rule-incomplete"
				>
					{{ i18n.baseText('agents.toolPolicy.rule.incomplete') }}
				</N8nText>

				<N8nCallout
					v-for="warning in ruleWarnings(rule)"
					:key="warning.key"
					theme="warning"
					slim
					data-testid="agent-tool-policy-rule-warning"
				>
					{{ warning.text }}
				</N8nCallout>
			</div>

			<div>
				<N8nButton
					variant="ghost"
					icon="plus"
					size="small"
					:disabled="!canAddRule"
					data-testid="agent-tool-policy-add-rule"
					data-attr="agent-tool-policy-add-rule"
					@click="addRule"
				>
					{{ i18n.baseText('agents.toolPolicy.rules.add') }}
				</N8nButton>
				<N8nActionDropdown
					:items="templateItems"
					:disabled="!canAddRule"
					placement="bottom-start"
					data-testid="agent-tool-policy-templates"
					@select="applyTemplate"
				>
					<template #activator>
						<N8nButton
							variant="ghost"
							icon="layout-template"
							size="small"
							:disabled="!canAddRule"
							data-testid="agent-tool-policy-templates-trigger"
							data-attr="agent-tool-policy-templates-trigger"
						>
							{{ i18n.baseText('agents.toolPolicy.templates.button') }}
						</N8nButton>
					</template>
				</N8nActionDropdown>
			</div>
		</div>
	</AgentPanel>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.rule {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.ruleHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.ruleToggle {
	display: inline-flex;
	flex: none;
	padding: 0;
	border: 0;
	background: none;
	color: var(--text-color--subtler);
	cursor: pointer;
}

.ruleName {
	flex: 1 1 0;
	min-width: 0;
}

// One part of the sentence: a connecting word, then the tools that it is about.
.line {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.word {
	flex: none;
	width: calc(var(--spacing--3xl) + var(--spacing--sm));
}

.wordWide {
	flex: none;
	width: calc(var(--spacing--4xl) + var(--spacing--sm));
}

.words {
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	white-space: nowrap;
}

.tail {
	flex: none;
	line-height: var(--spacing--xl);
}

.covers {
	margin-top: calc(var(--spacing--2xs) * -1);
}

.summary {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.action {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.actionDeny {
	color: var(--callout--color--text--warning);
}

.message {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
