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
import AgentPanel from './AgentPanel.vue';
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
	} catch {
		// Rules for the whole server still work, and a saved rule for one tool stays selected.
	}
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

interface SelectOption {
	key: string;
	label: string;
	selector: ToolPolicySelector;
}

/** The agent options, plus the selected ones that the agent no longer has. */
function selectOptions(selected: ToolPolicySelector[]): SelectOption[] {
	const list: SelectOption[] = options.value.map((option) => ({
		key: option.key,
		label: sourceLabel(option.source),
		selector: option.selector,
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

const appliesOptions = computed<Array<{ value: ToolPolicyAppliesMode; label: string }>>(() => [
	{ value: 'always', label: i18n.baseText('agents.toolPolicy.applies.always') },
	{ value: 'after', label: i18n.baseText('agents.toolPolicy.applies.after') },
	{ value: 'afterAll', label: i18n.baseText('agents.toolPolicy.applies.afterAll') },
]);

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
					<N8nInlineTextEdit
						:model-value="rule.name"
						:placeholder="
							i18n.baseText('agents.toolPolicy.rule.title', {
								interpolate: { index: String(index + 1) },
							})
						"
						:max-length="TOOL_POLICY_NAME_MAX_LENGTH"
						:disabled="disabled"
						:class="shared.dataEntryLabel"
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

				<div :class="shared.settingRow">
					<div :class="shared.settingLabel">
						<N8nText step="sm" :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.toolPolicy.rule.action.label') }}
						</N8nText>
					</div>
					<N8nSelect
						:model-value="rule.action"
						size="small"
						:disabled="disabled"
						:class="shared.settingControlShort"
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
				</div>

				<div :class="shared.settingRow">
					<div :class="shared.settingLabel">
						<N8nText step="sm" :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.toolPolicy.rule.tools.label') }}
						</N8nText>
					</div>
					<N8nSelect
						:model-value="rule.tools.map(toolPolicySelectorKey)"
						multiple
						filterable
						size="small"
						:disabled="disabled"
						:placeholder="i18n.baseText('agents.toolPolicy.rule.tools.placeholder')"
						:class="shared.settingControlWide"
						data-testid="agent-tool-policy-rule-tools"
						@update:model-value="onRuleTools(rule, $event)"
					>
						<N8nOption
							v-for="option in selectOptions(rule.tools)"
							:key="option.key"
							:value="option.key"
							:label="option.label"
						/>
					</N8nSelect>
				</div>

				<div :class="shared.settingRow">
					<div :class="shared.settingLabel">
						<N8nText step="sm" :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.toolPolicy.rule.applies.label') }}
						</N8nText>
					</div>
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
						:class="shared.settingControlWide"
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
				</div>

				<div v-if="needsToolUsed(rule.applies)" :class="shared.settingRow">
					<div :class="shared.settingLabel">
						<N8nText step="sm" :class="shared.dataEntryLabel">
							{{ i18n.baseText('agents.toolPolicy.rule.toolUsed.label') }}
						</N8nText>
					</div>
					<N8nSelect
						:model-value="rule.toolUsed.map(toolPolicySelectorKey)"
						multiple
						filterable
						size="small"
						:disabled="disabled"
						:placeholder="i18n.baseText('agents.toolPolicy.rule.tools.placeholder')"
						:class="shared.settingControlWide"
						data-testid="agent-tool-policy-rule-tool-used"
						@update:model-value="onRuleToolUsed(rule, $event)"
					>
						<N8nOption
							v-for="option in selectOptions(rule.toolUsed)"
							:key="option.key"
							:value="option.key"
							:label="option.label"
						/>
					</N8nSelect>
				</div>

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
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.message {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
