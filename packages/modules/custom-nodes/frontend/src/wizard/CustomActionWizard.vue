<script setup lang="ts">
import type { CustomActionEditKind } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialogBody,
	N8nDialogFooter,
	N8nSpinner,
	N8nText,
	type ComboboxOptionBase,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { computed, onMounted, ref } from 'vue';

import { useTypeNames } from '../composables/useTypeNames';
import { CUSTOM_NODE_CREATE_SCOPE, CUSTOM_NODE_UPDATE_SCOPE } from '../custom-nodes.constants';
import { useCustomNodesStore } from '../custom-nodes.store';
import ChooseStep from './steps/ChooseStep.vue';
import FieldsStep from './steps/FieldsStep.vue';
import RequestStep from './steps/RequestStep.vue';
import ReviewStep from './steps/ReviewStep.vue';
import { useCustomActionDraft } from './useCustomActionDraft';
import { WIZARD_STEPS, type CustomActionWizardData, type WizardStep } from './wizard.types';

/**
 * The content of the wizard dialog. The dialog mounts it for each opening, so each opening
 * starts from the open data.
 */
const props = defineProps<{ data: CustomActionWizardData }>();

const emit = defineEmits<{ close: []; saved: []; busy: [busy: boolean] }>();

const SAVED_MESSAGES: Record<CustomActionEditKind, BaseTextKey> = {
	version: 'customNodes.wizard.saved.version',
	revision: 'customNodes.wizard.saved.changes',
	cosmetic: 'customNodes.wizard.saved.changes',
	none: 'customNodes.wizard.saved.none',
};

const i18n = useI18n();
const toast = useToast();
const store = useCustomNodesStore();
const rbacStore = useRBACStore();
const typeNames = useTypeNames();
const wizard = useCustomActionDraft();
const { target, node, name, description, request, inputs, changeNote } = wizard;

const step = ref<WizardStep>('choose');
/** Steps that the user left once. Their issues show from then on. */
const visited = ref<WizardStep[]>([]);
const loading = ref(true);
const saving = ref(false);

const stepIndex = computed(() => WIZARD_STEPS.indexOf(step.value));
const isEdit = computed(() => wizard.editingAction.value !== null);

const stepIndicator = computed(() =>
	i18n.baseText('customNodes.wizard.stepIndicator', {
		interpolate: {
			current: String(stepIndex.value + 1),
			total: String(WIZARD_STEPS.length),
			name: i18n.baseText(`customNodes.wizard.step.${step.value}`),
		},
	}),
);

// An action of a custom node needs `customNode:update`, an action of a parent `customNode:create`.
const targetItems = computed((): ComboboxOptionBase[] =>
	[
		...(rbacStore.hasScope(CUSTOM_NODE_UPDATE_SCOPE) ? store.nodes : []).map((custom) => ({
			value: `node:${custom.id}`,
			label: custom.displayName,
		})),
		...(rbacStore.hasScope(CUSTOM_NODE_CREATE_SCOPE) ? store.parents : []).map((parent) => ({
			value: `parent:${parent.nodeType}`,
			label: typeNames.nodeDisplayName(parent.nodeType),
		})),
	].sort((a, b) => a.label.localeCompare(b.label)),
);

const targetLabel = computed(() => {
	const current = target.value;
	if (current?.kind === 'parent') return typeNames.nodeDisplayName(current.parentNodeType);
	if (current?.kind === 'node') {
		return store.nodes.find((custom) => custom.id === current.customNodeId)?.displayName;
	}
	return undefined;
});

const credentialLabel = computed(() => {
	const auth = node.value.auth;
	if (auth.kind !== 'predefined' || auth.credentialType === '') return undefined;
	const label = typeNames.credentialDisplayName(auth.credentialType);
	return label === auth.credentialType ? undefined : label;
});

const stepIssues = (forStep: WizardStep) =>
	visited.value.includes(forStep) || step.value === 'review' ? wizard.issuesOfStep(forStep) : [];

function close() {
	emit('close');
}

async function goTo(next: WizardStep) {
	if (!visited.value.includes(step.value)) visited.value = [...visited.value, step.value];
	step.value = next;
	if (next === 'review') await wizard.runPreview();
}

async function onNext() {
	await goTo(WIZARD_STEPS[stepIndex.value + 1]);
}

function onBack() {
	step.value = WIZARD_STEPS[stepIndex.value - 1];
}

/** Fills the wizard from the open data. */
function applyData() {
	const data = props.data;
	if (data.mode === 'edit' && data.actionId) {
		if (!wizard.loadAction(data.actionId)) {
			toast.showMessage({ title: i18n.baseText('customNodes.wizard.notFound'), type: 'error' });
			close();
		}
		return;
	}
	if (data.httpRequestParameters) wizard.fromHttpRequestParameters(data.httpRequestParameters);

	const customNode =
		store.nodes.find((custom) => custom.id === data.customNodeId) ??
		store.nodes.find((custom) => custom.nodeType === data.parentNodeType);
	if (customNode) {
		target.value = { kind: 'node', customNodeId: customNode.id };
	} else if (data.parentNodeType) {
		target.value = { kind: 'parent', parentNodeType: data.parentNodeType };
	} else if (node.value.auth.kind === 'predefined') {
		// The HTTP Request node used the credential of a node. Offer that node when it is the only one.
		const parentTypes = store.parents.map((parent) => parent.nodeType);
		const matches = typeNames.nodeTypesWithCredential(node.value.auth.credentialType, parentTypes);
		if (matches.length === 1) target.value = { kind: 'parent', parentNodeType: matches[0] };
	}
}

async function save() {
	saving.value = true;
	emit('busy', true);
	try {
		const { kind } = await wizard.save();
		if (kind) {
			toast.showMessage({
				title: i18n.baseText(SAVED_MESSAGES[kind]),
				message:
					kind === 'version'
						? i18n.baseText('customNodes.wizard.saved.version.description')
						: undefined,
				type: kind === 'none' ? 'info' : 'success',
			});
		} else {
			toast.showMessage({
				title: i18n.baseText(
					target.value?.kind === 'newNode'
						? 'customNodes.wizard.saved.node'
						: 'customNodes.wizard.saved.action',
				),
				type: 'success',
			});
		}
		emit('saved');
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.wizard.save.error'));
	} finally {
		saving.value = false;
		emit('busy', false);
	}
}

onMounted(async () => {
	try {
		await Promise.all([store.fetchAll(), store.fetchParents(), typeNames.load()]);
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.wizard.load.error'));
	}
	applyData();
	loading.value = false;
});
</script>

<template>
	<!-- One root for the body and the footer. `display: contents` keeps the dialog layout. -->
	<div :class="$style.root">
		<N8nDialogBody :class="$style.body">
			<div v-if="loading" :class="$style.loading" data-test-id="custom-action-wizard-loading">
				<N8nSpinner />
			</div>
			<template v-else>
				<N8nText size="small" color="text-light" data-test-id="custom-action-wizard-step">
					{{ stepIndicator }}
				</N8nText>
				<ChooseStep
					v-if="step === 'choose'"
					v-model:target="target"
					v-model:node="node"
					v-model:name="name"
					v-model:description="description"
					:mode="isEdit ? 'edit' : 'create'"
					:target-items="targetItems"
					:edit-target-label="targetLabel"
					:credential-label="credentialLabel"
					:issues="stepIssues('choose')"
				/>
				<RequestStep
					v-else-if="step === 'request'"
					:request="request"
					:absolute-url="target?.kind === 'parent'"
					:base-url="wizard.baseUrl.value"
					:issues="stepIssues('request')"
					@update:request="wizard.updateRequest"
				/>
				<FieldsStep
					v-else-if="step === 'fields'"
					:inputs="inputs"
					:issues="stepIssues('fields')"
					@update:inputs="wizard.updateInputs"
				/>
				<ReviewStep
					v-else
					v-model:change-note="changeNote"
					:host="wizard.requestHost.value"
					:properties="wizard.previewProperties.value"
					:issues="wizard.issues.value"
					:loading="wizard.previewLoading.value"
					:failed="wizard.previewFailed.value"
					:show-credential-note="wizard.usesCredentialDomains.value"
					:dropped-secrets="wizard.droppedSecrets.value"
					:show-change-note="isEdit"
					@go-to-step="step = $event"
					@retry="wizard.runPreview"
				/>
			</template>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				v-if="stepIndex === 0"
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="custom-action-wizard-cancel"
				@click="close"
			/>
			<N8nButton
				v-else
				variant="outline"
				:label="i18n.baseText('generic.back')"
				:disabled="saving"
				data-test-id="custom-action-wizard-back"
				@click="onBack"
			/>
			<N8nButton
				v-if="step !== 'review'"
				variant="solid"
				:label="i18n.baseText('generic.next')"
				:disabled="loading"
				data-test-id="custom-action-wizard-next"
				@click="onNext"
			/>
			<N8nButton
				v-else
				variant="solid"
				:label="i18n.baseText('generic.save')"
				:loading="saving"
				:disabled="!wizard.canSave.value || saving"
				data-test-id="custom-action-wizard-save"
				@click="save"
			/>
		</N8nDialogFooter>
	</div>
</template>

<style module lang="scss">
.root {
	display: contents;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.loading {
	display: flex;
	justify-content: center;
	padding: var(--spacing--lg);
}
</style>
