<script setup lang="ts">
import type { WorkflowRulesScanResponse } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogClose,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import {
	NODE_SUBJECTS,
	OPERATORS,
	OPERATORS_WITHOUT_VALUE,
	SUBJECTS_WITH_PATH,
	WORKFLOW_SUBJECTS,
	customRuleSchema,
	type CustomRule,
	type CustomRuleOperator,
	type CustomRuleSubject,
	type RuleSeverity,
} from '@n8n/workflow-rules';
import { computed, ref, watch } from 'vue';

import RuleSeverityControl from './RuleSeverityControl.vue';

const props = defineProps<{
	open: boolean;
	rule: CustomRule | null;
	allowAdjustable: boolean;
	preview: (rule: CustomRule) => Promise<WorkflowRulesScanResponse>;
	/** Ids already in use, so a new rule gets a readable id that CI output can show. */
	existingIds: readonly string[];
}>();

const emit = defineEmits<{ save: [rule: CustomRule]; close: [] }>();

const i18n = useI18n();

const SUBJECT_TEXT: Record<CustomRuleSubject, BaseTextKey> = {
	parameter: 'workflowRules.custom.subject.parameter',
	nodeName: 'workflowRules.custom.subject.nodeName',
	nodeType: 'workflowRules.custom.subject.nodeType',
	credentialType: 'workflowRules.custom.subject.credentialType',
	disabled: 'workflowRules.custom.subject.disabled',
	retryOnFail: 'workflowRules.custom.subject.retryOnFail',
	workflowName: 'workflowRules.custom.subject.workflowName',
	description: 'workflowRules.custom.subject.description',
	setting: 'workflowRules.custom.subject.setting',
	nodeCount: 'workflowRules.custom.subject.nodeCount',
};

const OPERATOR_TEXT: Record<CustomRuleOperator, BaseTextKey> = {
	isSet: 'workflowRules.custom.operator.isSet',
	isNotSet: 'workflowRules.custom.operator.isNotSet',
	equals: 'workflowRules.custom.operator.equals',
	notEquals: 'workflowRules.custom.operator.notEquals',
	oneOf: 'workflowRules.custom.operator.oneOf',
	notOneOf: 'workflowRules.custom.operator.notOneOf',
	contains: 'workflowRules.custom.operator.contains',
	notContains: 'workflowRules.custom.operator.notContains',
	matches: 'workflowRules.custom.operator.matches',
	notMatches: 'workflowRules.custom.operator.notMatches',
	lessThan: 'workflowRules.custom.operator.lessThan',
	greaterThan: 'workflowRules.custom.operator.greaterThan',
	isExpression: 'workflowRules.custom.operator.isExpression',
	isNotExpression: 'workflowRules.custom.operator.isNotExpression',
};

const BOOLEAN_SUBJECTS = new Set<CustomRuleSubject>(['disabled', 'retryOnFail']);
const LIST_OPERATORS = new Set<CustomRuleOperator>(['oneOf', 'notOneOf']);
const NUMBER_OPERATORS = new Set<CustomRuleOperator>(['lessThan', 'greaterThan']);

const name = ref('');
const description = ref('');
const severity = ref<RuleSeverity>('warn');
const adjustable = ref(false);
const targetKind = ref<'workflow' | 'nodes'>('nodes');
const nodeTypes = ref('');
const subject = ref<CustomRuleSubject>('parameter');
const path = ref('');
const operator = ref<CustomRuleOperator>('isSet');
const value = ref('');
const ignoreCase = ref(false);
const message = ref('');
const errors = ref<string[]>([]);
const previewResult = ref<WorkflowRulesScanResponse | null>(null);
const previewRuleId = ref<string | null>(null);
const previewing = ref(false);

const dialogOpen = computed({
	get: () => props.open,
	set: (open) => {
		if (!open) emit('close');
	},
});

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		const rule = props.rule;
		errors.value = [];
		previewResult.value = null;
		name.value = rule?.name ?? '';
		description.value = rule?.description ?? '';
		severity.value = rule?.severity ?? 'warn';
		adjustable.value = rule?.adjustable ?? false;
		targetKind.value = rule?.target.kind ?? 'nodes';
		nodeTypes.value = rule?.target.kind === 'nodes' ? rule.target.nodeTypes.join(', ') : '';
		subject.value = rule?.require.subject ?? 'parameter';
		path.value = rule?.require.path ?? '';
		operator.value = rule?.require.operator ?? 'isSet';
		const current = rule?.require.value;
		value.value = Array.isArray(current)
			? current.join(', ')
			: current === undefined
				? ''
				: String(current);
		ignoreCase.value = rule?.require.flags === 'i';
		message.value = rule?.message ?? '';
	},
	{ immediate: true },
);

const subjects = computed(() => (targetKind.value === 'nodes' ? NODE_SUBJECTS : WORKFLOW_SUBJECTS));

watch(targetKind, () => {
	if (!(subjects.value as readonly string[]).includes(subject.value))
		subject.value = subjects.value[0];
});

const needsValue = computed(() => !OPERATORS_WITHOUT_VALUE.has(operator.value));

function parsedValue(): CustomRule['require']['value'] {
	if (!needsValue.value) return undefined;
	if (LIST_OPERATORS.has(operator.value)) {
		return value.value
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
	}
	if (NUMBER_OPERATORS.has(operator.value)) return Number(value.value);
	if (BOOLEAN_SUBJECTS.has(subject.value)) return value.value === 'true';
	return value.value;
}

function slug(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
}

function uniqueId(base: string) {
	const taken = new Set(props.existingIds);
	if (!taken.has(base)) return base;
	let suffix = 2;
	while (taken.has(`${base}-${suffix}`)) suffix++;
	return `${base}-${suffix}`;
}

function buildRule(): CustomRule | null {
	const id = props.rule?.id ?? uniqueId(`custom-${slug(name.value) || 'rule'}`);
	const result = customRuleSchema.safeParse({
		id,
		name: name.value,
		...(description.value.trim() ? { description: description.value.trim() } : {}),
		severity: severity.value,
		...(props.allowAdjustable && adjustable.value ? { adjustable: true } : {}),
		target:
			targetKind.value === 'workflow'
				? { kind: 'workflow' }
				: {
						kind: 'nodes',
						nodeTypes: nodeTypes.value
							.split(',')
							.map((type) => type.trim())
							.filter(Boolean),
					},
		require: {
			subject: subject.value,
			...(SUBJECTS_WITH_PATH.has(subject.value) ? { path: path.value.trim() } : {}),
			operator: operator.value,
			value: parsedValue(),
			...(ignoreCase.value ? { flags: 'i' } : {}),
		},
		...(message.value.trim() ? { message: message.value.trim() } : {}),
	});
	if (!result.success) {
		errors.value = result.error.issues.map((issue) => issue.message);
		return null;
	}
	errors.value = [];
	return result.data;
}

async function onPreview() {
	const rule = buildRule();
	if (!rule) return;
	previewing.value = true;
	try {
		previewRuleId.value = rule.id;
		previewResult.value = await props.preview(rule);
	} finally {
		previewing.value = false;
	}
}

/** Workflows the previewed rule reports, not the findings of every other rule in the draft. */
const previewMatches = computed(() =>
	(previewResult.value?.workflows ?? []).filter((workflow) =>
		workflow.findings.some((finding) => finding.ruleId === previewRuleId.value),
	),
);

function onSave() {
	const rule = buildRule();
	if (rule) emit('save', rule);
}
</script>

<template>
	<N8nDialog
		v-model:open="dialogOpen"
		:header="
			rule
				? i18n.baseText('workflowRules.custom.editTitle')
				: i18n.baseText('workflowRules.custom.newTitle')
		"
		size="large"
	>
		<N8nDialogBody>
			<div :class="$style.form" data-test-id="workflow-rules-custom-dialog">
				<N8nInputLabel :label="i18n.baseText('workflowRules.custom.name')" required>
					<N8nInput
						v-model="name"
						:placeholder="i18n.baseText('workflowRules.custom.namePlaceholder')"
						data-test-id="workflow-rules-custom-name"
					/>
				</N8nInputLabel>

				<div :class="$style.sentence">
					<N8nText size="small" bold>{{ i18n.baseText('workflowRules.custom.appliesTo') }}</N8nText>
					<N8nSelect v-model="targetKind" size="small" data-test-id="workflow-rules-custom-target">
						<N8nOption value="nodes" :label="i18n.baseText('workflowRules.custom.target.nodes')" />
						<N8nOption
							value="workflow"
							:label="i18n.baseText('workflowRules.custom.target.workflow')"
						/>
					</N8nSelect>
				</div>
				<N8nInputLabel
					v-if="targetKind === 'nodes'"
					:label="i18n.baseText('workflowRules.custom.nodeTypes')"
				>
					<N8nInput
						v-model="nodeTypes"
						placeholder="n8n-nodes-base.httpRequest, n8n-nodes-base.code"
						data-test-id="workflow-rules-custom-node-types"
					/>
				</N8nInputLabel>

				<div :class="$style.requirement">
					<N8nText size="small" bold>{{ i18n.baseText('workflowRules.custom.require') }}</N8nText>
					<div :class="$style.requirementRow">
						<N8nSelect v-model="subject" size="small" data-test-id="workflow-rules-custom-subject">
							<N8nOption
								v-for="option in subjects"
								:key="option"
								:value="option"
								:label="i18n.baseText(SUBJECT_TEXT[option])"
							/>
						</N8nSelect>
						<N8nInput
							v-if="SUBJECTS_WITH_PATH.has(subject)"
							v-model="path"
							size="small"
							:placeholder="subject === 'parameter' ? 'options.timeout' : 'saveDataErrorExecution'"
							data-test-id="workflow-rules-custom-path"
						/>
						<N8nSelect
							v-model="operator"
							size="small"
							data-test-id="workflow-rules-custom-operator"
						>
							<N8nOption
								v-for="option in OPERATORS"
								:key="option"
								:value="option"
								:label="i18n.baseText(OPERATOR_TEXT[option])"
							/>
						</N8nSelect>
						<template v-if="needsValue">
							<N8nSelect
								v-if="BOOLEAN_SUBJECTS.has(subject) && !LIST_OPERATORS.has(operator)"
								v-model="value"
								size="small"
								data-test-id="workflow-rules-custom-value-boolean"
							>
								<N8nOption value="true" :label="i18n.baseText('workflowRules.custom.true')" />
								<N8nOption value="false" :label="i18n.baseText('workflowRules.custom.false')" />
							</N8nSelect>
							<N8nInput
								v-else
								v-model="value"
								size="small"
								:placeholder="
									LIST_OPERATORS.has(operator)
										? i18n.baseText('workflowRules.custom.listPlaceholder')
										: i18n.baseText('workflowRules.custom.valuePlaceholder')
								"
								data-test-id="workflow-rules-custom-value"
							/>
						</template>
					</div>
					<label v-if="operator === 'matches' || operator === 'notMatches'" :class="$style.toggle">
						<N8nSwitch2 v-model="ignoreCase" />
						<N8nText size="small">{{ i18n.baseText('workflowRules.options.ignoreCase') }}</N8nText>
					</label>
				</div>

				<N8nInputLabel :label="i18n.baseText('workflowRules.custom.message')">
					<N8nInput
						v-model="message"
						:placeholder="i18n.baseText('workflowRules.custom.messagePlaceholder')"
						data-test-id="workflow-rules-custom-message"
					/>
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('workflowRules.custom.description')">
					<N8nInput v-model="description" type="textarea" :rows="2" />
				</N8nInputLabel>

				<div :class="$style.sentence">
					<N8nText size="small" bold>{{ i18n.baseText('workflowRules.custom.severity') }}</N8nText>
					<RuleSeverityControl v-model="severity" />
					<label v-if="allowAdjustable" :class="$style.toggle">
						<N8nSwitch2 v-model="adjustable" />
						<N8nText size="small">{{ i18n.baseText('workflowRules.rules.adjustable') }}</N8nText>
					</label>
				</div>

				<N8nCallout
					v-if="errors.length > 0"
					theme="danger"
					slim
					data-test-id="workflow-rules-custom-errors"
				>
					{{ errors.join(' ') }}
				</N8nCallout>

				<div :class="$style.preview">
					<N8nButton
						variant="outline"
						size="small"
						icon="search"
						:loading="previewing"
						:label="i18n.baseText('workflowRules.custom.preview')"
						data-test-id="workflow-rules-custom-preview"
						@click="onPreview"
					/>
					<N8nText
						v-if="previewResult"
						size="small"
						data-test-id="workflow-rules-custom-preview-result"
					>
						{{
							i18n.baseText('workflowRules.custom.previewResult', {
								interpolate: { count: previewMatches.length },
								adjustToNumber: previewMatches.length,
							})
						}}
						<template v-if="previewMatches.length > 0">
							{{
								previewMatches
									.slice(0, 3)
									.map((workflow) => workflow.name)
									.join(', ')
							}}
						</template>
					</N8nText>
				</div>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nDialogClose as-child>
				<N8nButton variant="outline" :label="i18n.baseText('workflowRules.common.cancel')" />
			</N8nDialogClose>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('workflowRules.common.apply')"
				data-test-id="workflow-rules-custom-save"
				@click="onSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.sentence {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.requirement {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-2);
}

.requirementRow {
	display: grid;
	// Wraps the subject, path, operator and value fields on a narrow dialog; no token fits.
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: var(--spacing--2xs);
}

.toggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
}

.preview {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
