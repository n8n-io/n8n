<script setup lang="ts">
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nStepper,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import RuleFlow from './RuleFlow.vue';
import WizardCredentialStep from './WizardCredentialStep.vue';
import WizardEndpointsStep from './WizardEndpointsStep.vue';
import WizardSourceStep from './WizardSourceStep.vue';
import { useTypeIcons } from '../composables/useTypeIcons';
import type { RuntimeCredentialRule, RuntimeCredentialTransform } from '../runtime-credentials.api';
import { findTemplate } from '../runtime-credentials.presets';
import type { PathPresetId, RuleTemplateId } from '../runtime-credentials.presets';
import { useRuntimeCredentialsStore } from '../runtime-credentials.store';
import {
	buildPresetPath,
	buildTransform,
	detectPathPreset,
	findPathProblem,
	findRuleIssue,
	parseAllowedDomains,
	parseTransform,
	toAlias,
	uniqueAlias,
	findInvalidAllowedDomain,
} from '../runtime-credentials.utils';
import type { WizardStepId } from '../runtime-credentials.utils';

export type RuleFormValue = {
	alias: string;
	nodeType: string;
	path: string;
	credentialType: string;
	transform: RuntimeCredentialTransform;
	/** Empty string means any host. */
	allowedDomains: string;
};

/** Values that open the wizard filled in, for a template or a copy of a rule. */
export type RuleDraft = {
	alias?: string;
	nodeType: string;
	path: string;
	credentialType: string;
	transform?: RuntimeCredentialTransform;
	allowedDomains?: string;
};

/** An error from the server, tied to the step that it relates to when that is known. */
export type WizardError = { step?: WizardStepId; message: string };

const STEP_ORDER: readonly WizardStepId[] = ['source', 'credential', 'endpoints'];
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const {
	open,
	rule = undefined,
	draft = undefined,
	initialStep = 'source',
	existingAliases = [],
	saving = false,
	error = undefined,
} = defineProps<{
	open: boolean;
	/** The rule to edit. Leave it out to add a rule. */
	rule?: RuntimeCredentialRule;
	/** Values to start from when you add a rule. */
	draft?: RuleDraft;
	initialStep?: WizardStepId;
	existingAliases?: string[];
	saving?: boolean;
	error?: WizardError;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	save: [value: RuleFormValue];
}>();

const i18n = useI18n();
const store = useRuntimeCredentialsStore();
const { credentialLabel, nodeLabel } = useTypeIcons();

const isEdit = computed(() => rule !== undefined);

const currentStep = ref<WizardStepId>('source');
const visited = ref<Set<WizardStepId>>(new Set());

const alias = ref('');
const aliasTouched = ref(false);
const nodeType = ref('n8n-nodes-base.webhook');
const pathPreset = ref<PathPresetId>('authorization');
const presetName = ref('');
const customPath = ref('');
const credentialType = ref('');
const transformKind = ref<'bearer' | 'field'>('bearer');
const fieldName = ref('');
const hosts = ref<string[]>([]);
const hostDraft = ref('');

const path = computed(() =>
	pathPreset.value === 'custom'
		? customPath.value.trim()
		: buildPresetPath(pathPreset.value, presetName.value),
);

function applyValues(values: RuleDraft) {
	nodeType.value = values.nodeType;
	const detected = detectPathPreset(values.path);
	pathPreset.value = detected.preset;
	presetName.value = detected.name;
	customPath.value = detected.preset === 'custom' ? values.path : '';
	credentialType.value = values.credentialType;
	const parsed = parseTransform(values.transform);
	// A rule with no transform uses the bearer transform at run time.
	transformKind.value = parsed.kind === 'field' ? 'field' : 'bearer';
	fieldName.value = parsed.fieldName;
	hosts.value = parseAllowedDomains(values.allowedDomains);
	hostDraft.value = '';
}

function suggestAlias(): string {
	const typeBase = toAlias(credentialType.value).replace(/-api$/, '');
	return uniqueAlias(typeBase === '' ? 'run-time-input' : typeBase, existingAliases);
}

watch(
	() => [open, rule, draft] as const,
	() => {
		if (!open) return;
		visited.value = new Set();
		if (rule) {
			applyValues(rule);
			alias.value = rule.alias;
			aliasTouched.value = true;
			currentStep.value = initialStep;
		} else if (draft) {
			applyValues(draft);
			alias.value = uniqueAlias(draft.alias ?? '', existingAliases);
			aliasTouched.value = draft.alias !== undefined;
			currentStep.value = initialStep;
		} else {
			applyValues({
				nodeType: 'n8n-nodes-base.webhook',
				path: 'headers.authorization',
				credentialType: '',
			});
			alias.value = '';
			aliasTouched.value = false;
			currentStep.value = 'source';
		}
		visited.value.add(currentStep.value);
		void store.loadCatalogs();
	},
	{ immediate: true },
);

// Follow the credential type until the admin names the rule themselves.
watch(credentialType, () => {
	if (!isEdit.value && !aliasTouched.value) alias.value = suggestAlias();
});

function onAliasInput(value: string) {
	alias.value = value;
	aliasTouched.value = true;
}

function applyTemplate(id: RuleTemplateId) {
	const template = findTemplate(id);
	if (!template) return;
	applyValues(template);
	alias.value = uniqueAlias(template.alias, existingAliases);
	aliasTouched.value = false;
}

// An error that the server ties to a step moves the admin to that step.
watch(
	() => error,
	(value) => {
		if (value?.step) goTo(value.step);
	},
);

function goTo(step: WizardStepId) {
	currentStep.value = step;
	visited.value.add(step);
}

const pathProblem = computed(() => findPathProblem(path.value));
const hostProblem = computed(() => findInvalidAllowedDomain(hostDraft.value));
const allowedDomains = computed(() =>
	[...new Set([...hosts.value, ...parseAllowedDomains(hostDraft.value)])].join(', '),
);

const transform = computed(() => buildTransform(transformKind.value, fieldName.value));
const credentialIssue = computed(() =>
	findRuleIssue(
		{ credentialType: credentialType.value.trim(), transform: transform.value },
		store.credentialTypes,
	),
);

const stepValid = computed<Record<WizardStepId, boolean>>(() => ({
	source: nodeType.value.trim() !== '' && pathProblem.value === undefined,
	credential:
		credentialType.value.trim() !== '' &&
		(transformKind.value !== 'field' || fieldName.value.trim() !== '') &&
		credentialIssue.value === undefined,
	endpoints: hostProblem.value === undefined,
}));

const aliasTaken = computed(() => !isEdit.value && existingAliases.includes(alias.value.trim()));
const aliasValid = computed(() => ALIAS_PATTERN.test(alias.value.trim()) && !aliasTaken.value);
const allValid = computed(
	() => aliasValid.value && STEP_ORDER.every((step) => stepValid.value[step]),
);

const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value));
const isLast = computed(() => stepIndex.value === STEP_ORDER.length - 1);
const showSave = computed(() => isLast.value || isEdit.value);

function next() {
	if (!isLast.value) goTo(STEP_ORDER[stepIndex.value + 1]);
}

function back() {
	if (stepIndex.value > 0) goTo(STEP_ORDER[stepIndex.value - 1]);
}

const draftRule = computed(() => ({
	nodeType: nodeType.value,
	path: path.value,
	credentialType: credentialType.value.trim(),
	transform: transform.value,
	allowedDomains: allowedDomains.value,
}));

const hasDraftRule = computed(
	() => path.value !== '' && credentialType.value.trim() !== '' && nodeType.value !== '',
);

const baseline = computed(() => (rule ? { nodeType: rule.nodeType, path: rule.path } : undefined));

function summaryFor(step: WizardStepId): string {
	switch (step) {
		case 'source':
			return i18n.baseText('runtimeCredentials.wizard.step.source.summary', {
				interpolate: { trigger: nodeLabel(nodeType.value), path: path.value },
			});
		case 'credential': {
			const { kind, fieldName: name } = parseTransform(transform.value);
			return i18n.baseText('runtimeCredentials.wizard.step.credential.summary', {
				interpolate: {
					credential: credentialLabel(credentialType.value.trim()),
					transform:
						kind === 'field'
							? i18n.baseText('runtimeCredentials.rules.transform.field', {
									interpolate: { name },
								})
							: i18n.baseText('runtimeCredentials.rules.transform.bearer'),
				},
			});
		}
		case 'endpoints':
			return allowedDomains.value === ''
				? i18n.baseText('runtimeCredentials.rules.allowedDomains.any')
				: allowedDomains.value;
	}
}

const steps = computed(() =>
	STEP_ORDER.map((id) => {
		const done = visited.value.has(id) && id !== currentStep.value && stepValid.value[id];
		return {
			id,
			title: i18n.baseText(`runtimeCredentials.wizard.step.${id}.title`),
			description: done
				? summaryFor(id)
				: i18n.baseText(`runtimeCredentials.wizard.step.${id}.hint`),
		};
	}),
);

const sentence = computed(() => {
	if (!hasDraftRule.value) return '';
	const { kind, fieldName: name } = parseTransform(transform.value);
	return i18n.baseText('runtimeCredentials.wizard.summary.sentence', {
		interpolate: {
			path: path.value,
			credential: credentialLabel(credentialType.value.trim()),
			transform:
				kind === 'field'
					? i18n.baseText('runtimeCredentials.wizard.summary.transform.field', {
							interpolate: { name },
						})
					: i18n.baseText('runtimeCredentials.wizard.summary.transform.bearer'),
			endpoints:
				allowedDomains.value === ''
					? i18n.baseText('runtimeCredentials.wizard.summary.endpoints.any')
					: i18n.baseText('runtimeCredentials.wizard.summary.endpoints.hosts', {
							interpolate: { hosts: allowedDomains.value },
						}),
		},
	});
});

function errorFor(step: string): string | undefined {
	return error?.step === step ? error.message : undefined;
}

function onSave() {
	if (!allValid.value || transform.value === undefined) return;
	emit('save', {
		alias: alias.value.trim(),
		nodeType: nodeType.value.trim(),
		path: path.value,
		credentialType: credentialType.value.trim(),
		transform: transform.value,
		allowedDomains: allowedDomains.value,
	});
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="
			isEdit
				? i18n.baseText('runtimeCredentials.wizard.title.edit', {
						interpolate: { alias: rule?.alias ?? '' },
					})
				: i18n.baseText('runtimeCredentials.wizard.title.add')
		"
		size="large"
		data-test-id="runtime-rule-wizard"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogBody>
			<form :class="$style.form" data-test-id="runtime-rule-form" @submit.prevent="onSave">
				<N8nCallout
					v-if="error && !error.step"
					theme="danger"
					slim
					data-test-id="runtime-rule-error"
				>
					{{ error.message }}
				</N8nCallout>
				<N8nStepper :steps="steps" data-test-id="runtime-wizard-stepper">
					<template #default="{ step }">
						<template v-if="step.id === currentStep">
							<N8nCallout
								v-if="errorFor(step.id)"
								theme="danger"
								slim
								:class="$style.stepError"
								:data-test-id="`runtime-wizard-error-${step.id}`"
							>
								{{ errorFor(step.id) }}
							</N8nCallout>
							<WizardSourceStep
								v-if="step.id === 'source'"
								v-model:node-type="nodeType"
								v-model:preset="pathPreset"
								v-model:preset-name="presetName"
								v-model:custom-path="customPath"
								:path="path"
								:problem="pathProblem"
								:show-templates="!isEdit"
								@template="applyTemplate"
							/>
							<WizardCredentialStep
								v-else-if="step.id === 'credential'"
								v-model:credential-type="credentialType"
								v-model:transform-kind="transformKind"
								v-model:field-name="fieldName"
							/>
							<WizardEndpointsStep
								v-else
								v-model:hosts="hosts"
								v-model:draft="hostDraft"
								:node-type="nodeType"
								:path="path"
								:baseline="baseline"
							/>
						</template>
					</template>
				</N8nStepper>

				<section :class="$style.review" data-test-id="runtime-wizard-review">
					<div :class="$style.reviewHeader">
						<N8nText size="small" bold>
							{{ i18n.baseText('runtimeCredentials.wizard.summary.title') }}
						</N8nText>
					</div>
					<template v-if="hasDraftRule">
						<RuleFlow :rule="draftRule" id-suffix="draft" />
						<N8nText size="small" color="text-base" data-test-id="runtime-wizard-sentence">
							{{ sentence }}
						</N8nText>
					</template>
					<N8nText v-else size="small" color="text-light">
						{{ i18n.baseText('runtimeCredentials.wizard.summary.empty') }}
					</N8nText>
					<N8nInputLabel
						:label="i18n.baseText('runtimeCredentials.wizard.alias.label')"
						input-name="runtime-rule-alias"
						size="small"
					>
						<N8nInput
							id="runtime-rule-alias"
							:model-value="alias"
							:disabled="isEdit"
							:placeholder="i18n.baseText('runtimeCredentials.rules.modal.alias.placeholder')"
							data-test-id="runtime-rule-alias"
							@update:model-value="onAliasInput"
						/>
					</N8nInputLabel>
					<N8nText
						v-if="isEdit"
						size="small"
						color="text-light"
						data-test-id="runtime-wizard-alias-locked"
					>
						{{ i18n.baseText('runtimeCredentials.rules.modal.cannotChange') }}
					</N8nText>
					<N8nText
						v-else-if="alias.trim() !== '' && !aliasValid"
						size="small"
						color="danger"
						data-test-id="runtime-wizard-alias-error"
					>
						{{
							aliasTaken
								? i18n.baseText('runtimeCredentials.rules.error.duplicate', {
										interpolate: { alias: alias.trim() },
									})
								: i18n.baseText('runtimeCredentials.wizard.alias.invalid')
						}}
					</N8nText>
				</section>
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="runtime-wizard-cancel"
				@click="emit('update:open', false)"
			/>
			<N8nButton
				v-if="stepIndex > 0"
				variant="ghost"
				:label="i18n.baseText('generic.back')"
				data-test-id="runtime-wizard-back"
				@click="back"
			/>
			<N8nButton
				v-if="!isLast"
				:variant="isEdit ? 'outline' : 'solid'"
				:label="i18n.baseText('generic.next')"
				:disabled="!stepValid[currentStep]"
				data-test-id="runtime-wizard-next"
				@click="next"
			/>
			<N8nButton
				v-if="showSave"
				variant="solid"
				:label="i18n.baseText('runtimeCredentials.rules.modal.save')"
				:disabled="!allValid"
				:loading="saving"
				data-test-id="runtime-wizard-save"
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

.stepError {
	margin-block-start: var(--spacing--xs);
}

.review {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
}

.reviewHeader {
	display: flex;
	align-items: center;
}
</style>
