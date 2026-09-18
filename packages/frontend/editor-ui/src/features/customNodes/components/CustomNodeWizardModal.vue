<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { CustomOperationDefinition, CustomOperationInputType } from '@n8n/api-types';
import type { INodeParameters, INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { createEventBus } from '@n8n/utils/event-bus';
import { useRootStore } from '@n8n/stores/useRootStore';
import { previewCustomOperation } from '@n8n/rest-api-client/api/customNodes';
import Modal from '@/app/components/Modal.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { toHttpNodeParameters } from '@/app/composables/useImportCurlCommand';
import { CUSTOM_NODE_TYPE_PREFIX, CUSTOM_NODE_WIZARD_MODAL_KEY } from '../customNodes.constants';
import { useCustomNodesStore } from '../customNodes.store';
import {
	authFromParentDescription,
	createEmptyDraft,
	createEntry,
	draftFromHttpRequestParameters,
	draftFromOperation,
	draftToVersionContent,
	readImageFileAsDataUri,
	toDisplayName,
	toIdentifier,
	type CustomNodeDraft,
	type DraftEntry,
	type DraftEntryTarget,
} from '../composables/useCustomNodeDraft';

interface ModalData {
	httpNodeParameters?: INodeParameters;
	editOperation?: CustomOperationDefinition;
}

type Step = 'choose' | 'request' | 'fields' | 'review';
const STEPS: Step[] = ['choose', 'request', 'fields', 'review'];
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const INPUT_TYPES: CustomOperationInputType[] = ['string', 'number', 'boolean', 'options', 'json'];
const GENERIC_AUTH_TYPES = [
	{ value: 'httpHeaderAuth', label: 'Header Auth' },
	{ value: 'httpBearerAuth', label: 'Bearer Auth' },
	{ value: 'httpBasicAuth', label: 'Basic Auth' },
	{ value: 'httpQueryAuth', label: 'Query Auth' },
] as const;

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const rootStore = useRootStore();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const customNodesStore = useCustomNodesStore();
const modalBus = createEventBus();

const modalData = computed(
	() => uiStore.modalsById[CUSTOM_NODE_WIZARD_MODAL_KEY]?.data as ModalData | undefined,
);

const draft = reactive<CustomNodeDraft>(createEmptyDraft());
const step = ref<Step>('choose');
const saving = ref(false);
const curlCommand = ref('');
const curlError = ref('');
const preview = ref<INodeTypeDescription | null>(null);
const previewLoading = ref(false);
const logoInput = ref<HTMLInputElement>();
const error = ref('');

const isEditing = computed(() => Boolean(draft.editingOperationId));
const stepIndex = computed(() => STEPS.indexOf(step.value));

const title = computed(() => {
	if (isEditing.value) return i18n.baseText('customNodes.wizard.title.edit');
	if (modalData.value?.httpNodeParameters) return i18n.baseText('customNodes.wizard.title.operation');
	return i18n.baseText('customNodes.wizard.title.create');
});

/** Installed nodes that can take a custom operation: non-trigger nodes with a credential, plus custom nodes. */
const parentCandidates = computed(() =>
	nodeTypesStore.visibleNodeTypes
		.filter(
			(nodeType) =>
				!nodeType.group.includes('trigger') &&
				!nodeType.customDefinition?.parentNodeType &&
				((nodeType.credentials?.length ?? 0) > 0 ||
					nodeType.name.startsWith(CUSTOM_NODE_TYPE_PREFIX)),
		)
		.sort((a, b) => a.displayName.localeCompare(b.displayName)),
);

const parentDescription = computed(() =>
	draft.parentNodeType ? nodeTypesStore.getNodeType(draft.parentNodeType) : null,
);

const parentIsCustomNode = computed(
	() => draft.parentNodeType?.startsWith(CUSTOM_NODE_TYPE_PREFIX) ?? false,
);

const predefinedCredentialTypes = computed(() =>
	credentialsStore.allCredentialTypes
		.filter((type) => 'authenticate' in type || type.extends?.includes('oAuth2Api'))
		.sort((a, b) => a.displayName.localeCompare(b.displayName)),
);

const entriesByTarget = (target: DraftEntryTarget) =>
	draft.entries.filter((entry) => entry.target === target);

const canGoNext = computed(() => {
	error.value = '';
	if (step.value === 'choose') {
		if (draft.mode === 'operation') return Boolean(draft.parentNodeType) && Boolean(draft.operationName.trim());
		return Boolean(draft.nodeDisplayName.trim()) && Boolean(draft.operationName.trim());
	}
	if (step.value === 'request') return Boolean(draft.url.trim());
	return true;
});

// ---------------------------------------------------------------- lifecycle

onMounted(async () => {
	await Promise.all([nodeTypesStore.loadNodeTypesIfNotLoaded(), credentialsStore.fetchCredentialTypes(false)]);
	const data = modalData.value;
	if (data?.editOperation) {
		Object.assign(draft, draftFromOperation(data.editOperation));
		return;
	}
	if (data?.httpNodeParameters) {
		Object.assign(draft, draftFromHttpRequestParameters(data.httpNodeParameters));
		suggestParentFromAuth();
	}
});

/** When the HTTP Request node used a predefined credential, propose the node that owns it. */
function suggestParentFromAuth() {
	if (draft.auth.kind !== 'predefined') return;
	const credentialType = draft.auth.credentialType;
	const parent = parentCandidates.value.find((nodeType) =>
		nodeType.credentials?.some((credential) => credential.name === credentialType),
	);
	if (parent) draft.parentNodeType = parent.name;
}

watch(
	() => draft.parentNodeType,
	() => {
		if (draft.mode !== 'operation' || parentIsCustomNode.value) return;
		draft.auth = authFromParentDescription(parentDescription.value);
	},
);

watch(step, async (value) => {
	if (value === 'review') await loadPreview();
});

// ------------------------------------------------------------------ steps

function goNext() {
	if (!canGoNext.value) {
		error.value =
			step.value === 'request'
				? i18n.baseText('customNodes.wizard.error.url')
				: draft.mode === 'operation' && !draft.parentNodeType
					? i18n.baseText('customNodes.wizard.error.parent')
					: i18n.baseText('customNodes.wizard.error.name');
		return;
	}
	step.value = STEPS[Math.min(stepIndex.value + 1, STEPS.length - 1)];
}

function goBack() {
	step.value = STEPS[Math.max(stepIndex.value - 1, 0)];
}

// ---------------------------------------------------------------- request

function addEntry(target: DraftEntryTarget) {
	draft.entries.push(createEntry({ target, key: '', mode: target === 'url' ? 'required' : 'fixed' }));
}

function removeEntry(entry: DraftEntry) {
	draft.entries = draft.entries.filter((item) => item.id !== entry.id);
}

function onEntryKeyChange(entry: DraftEntry) {
	entry.name = toIdentifier(entry.key);
	entry.displayName = toDisplayName(entry.key);
}

function importCurl() {
	curlError.value = '';
	try {
		const parameters = toHttpNodeParameters(curlCommand.value) as unknown as INodeParameters;
		const imported = draftFromHttpRequestParameters(parameters);
		Object.assign(draft, {
			method: imported.method,
			url: imported.url,
			bodyType: imported.bodyType,
			entries: imported.entries,
		});
		if (imported.auth && draft.mode === 'node') draft.auth = imported.auth;
		curlCommand.value = '';
	} catch {
		curlError.value = i18n.baseText('customNodes.wizard.request.importCurl.error');
	}
}

async function onLogoSelected(event: Event) {
	const file = (event.target as HTMLInputElement).files?.[0];
	if (!file) return;
	try {
		draft.iconDataUri = await readImageFileAsDataUri(file);
	} catch (err) {
		toast.showError(err, i18n.baseText('settings.customNodes.logo.invalid'));
	}
}

// ----------------------------------------------------------------- review

async function loadPreview() {
	previewLoading.value = true;
	try {
		preview.value = await previewCustomOperation(rootStore.restApiContext, {
			name: draft.operationName,
			parentNodeType: draft.mode === 'operation' && !parentIsCustomNode.value ? draft.parentNodeType : null,
			version: draftToVersionContent(draft),
		});
	} catch (err) {
		preview.value = null;
		toast.showError(err, i18n.baseText('customNodes.wizard.error.save'));
	} finally {
		previewLoading.value = false;
	}
}

const previewParameters = computed<INodeProperties[]>(() => preview.value?.properties ?? []);

function propertyTypeLabel(property: INodeProperties) {
	return property.type === 'collection' ? 'collection' : property.type;
}

/** Options of an "Additional Fields" collection are nested node properties. */
function collectionOptions(property: INodeProperties): INodeProperties[] {
	return (property.options ?? []).filter(
		(option): option is INodeProperties => 'type' in option && 'displayName' in option,
	);
}

// ------------------------------------------------------------------- save

async function save() {
	saving.value = true;
	try {
		const version = draftToVersionContent(draft);

		if (draft.editingOperationId) {
			const result = await customNodesStore.updateOperation(draft.editingOperationId, {
				name: draft.operationName,
				description: draft.operationDescription || undefined,
				version,
			});
			toast.showMessage({
				title: i18n.baseText('customNodes.wizard.saved.version', {
					interpolate: { version: String(result.activeVersion) },
				}),
				type: 'success',
			});
		} else if (draft.mode === 'operation') {
			const customNode = parentIsCustomNode.value
				? customNodesStore.nodes.find((node) => node.nodeType === draft.parentNodeType)
				: undefined;
			await customNodesStore.createOperation({
				name: draft.operationName,
				description: draft.operationDescription || undefined,
				parentNodeType: customNode ? null : draft.parentNodeType,
				customNodeId: customNode?.id ?? null,
				version,
			});
			toast.showMessage({
				title: i18n.baseText('customNodes.wizard.saved.operation', {
					interpolate: { node: parentDescription.value?.displayName ?? '' },
				}),
				type: 'success',
			});
		} else {
			await customNodesStore.createNode({
				name: toIdentifier(draft.nodeDisplayName),
				displayName: draft.nodeDisplayName,
				description: draft.nodeDescription || undefined,
				iconDataUri: draft.iconDataUri,
				baseUrl: draft.baseUrl || undefined,
				auth: draft.auth,
				operations: [
					{ name: draft.operationName, description: draft.operationDescription || undefined, version },
				],
			});
			toast.showMessage({ title: i18n.baseText('customNodes.wizard.saved.node'), type: 'success' });
		}
		modalBus.emit('close');
	} catch (err) {
		toast.showError(err, i18n.baseText('customNodes.wizard.error.save'));
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<Modal
		width="860px"
		:name="CUSTOM_NODE_WIZARD_MODAL_KEY"
		:title="title"
		:event-bus="modalBus"
		:before-close="() => !saving"
	>
		<template #content>
			<div :class="$style.wizard" data-test-id="custom-node-wizard">
				<!-- step header -->
				<div :class="$style.steps">
					<div
						v-for="(name, index) in STEPS"
						:key="name"
						:class="[$style.step, { [$style.active]: name === step, [$style.done]: index < stepIndex }]"
						@click="index < stepIndex && (step = name)"
					>
						<span :class="$style.stepNumber">{{ index + 1 }}</span>
						<N8nText size="small" :bold="name === step">
							{{ i18n.baseText(`customNodes.wizard.step.${name}`) }}
						</N8nText>
					</div>
				</div>

				<!-- 1. choose -->
				<div v-if="step === 'choose'" :class="$style.body">
					<div v-if="!isEditing" :class="$style.modeCards">
						<N8nCard
							:class="[$style.modeCard, { [$style.modeCardActive]: draft.mode === 'operation' }]"
							data-test-id="custom-node-mode-operation"
							@click="draft.mode = 'operation'"
						>
							<N8nIcon icon="plug" size="large" />
							<N8nText bold>{{ i18n.baseText('customNodes.wizard.choose.mode.operation') }}</N8nText>
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('customNodes.wizard.choose.mode.operation.description') }}
							</N8nText>
						</N8nCard>
						<N8nCard
							:class="[$style.modeCard, { [$style.modeCardActive]: draft.mode === 'node' }]"
							data-test-id="custom-node-mode-node"
							@click="draft.mode = 'node'"
						>
							<N8nIcon icon="blocks" size="large" />
							<N8nText bold>{{ i18n.baseText('customNodes.wizard.choose.mode.node') }}</N8nText>
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('customNodes.wizard.choose.mode.node.description') }}
							</N8nText>
						</N8nCard>
					</div>

					<template v-if="draft.mode === 'operation'">
						<N8nInputLabel :label="i18n.baseText('customNodes.wizard.choose.parentNode')" :bold="false">
							<N8nSelect
								v-model="draft.parentNodeType"
								filterable
								:disabled="isEditing"
								:placeholder="i18n.baseText('customNodes.wizard.choose.parentNode.placeholder')"
								data-test-id="custom-node-parent-select"
							>
								<N8nOption
									v-for="nodeType in parentCandidates"
									:key="nodeType.name"
									:value="nodeType.name"
									:label="nodeType.displayName"
								>
									<div :class="$style.option">
										<NodeIcon :node-type="nodeType" :size="18" />
										<span>{{ nodeType.displayName }}</span>
									</div>
								</N8nOption>
							</N8nSelect>
						</N8nInputLabel>
						<N8nNotice
							v-if="parentDescription && draft.auth.kind !== 'none'"
							theme="info"
							:content="
								i18n.baseText('customNodes.wizard.choose.auth.inheritsParent', {
									interpolate: { node: parentDescription.displayName },
								})
							"
						/>
					</template>

					<template v-else>
						<div :class="$style.grid2">
							<N8nInputLabel :label="i18n.baseText('customNodes.wizard.choose.nodeDisplayName')" :bold="false">
								<N8nInput
									v-model="draft.nodeDisplayName"
									:placeholder="i18n.baseText('customNodes.wizard.choose.nodeDisplayName.placeholder')"
									data-test-id="custom-node-display-name"
								/>
							</N8nInputLabel>
							<N8nInputLabel :label="i18n.baseText('customNodes.wizard.choose.baseUrl')" :bold="false">
								<N8nInput
									v-model="draft.baseUrl"
									:placeholder="i18n.baseText('customNodes.wizard.choose.baseUrl.placeholder')"
								/>
							</N8nInputLabel>
						</div>
						<N8nInputLabel :label="i18n.baseText('customNodes.wizard.choose.nodeDescription')" :bold="false">
							<N8nInput v-model="draft.nodeDescription" type="textarea" :rows="2" />
						</N8nInputLabel>
						<div :class="$style.grid2">
							<N8nInputLabel :label="i18n.baseText('customNodes.wizard.choose.logo')" :bold="false">
								<div :class="$style.logoRow">
									<img v-if="draft.iconDataUri" :src="draft.iconDataUri" :class="$style.logoPreview" alt="" />
									<N8nIcon v-else icon="cube" size="large" />
									<N8nButton
										size="small"
										variant="outline"
										:label="i18n.baseText('customNodes.wizard.choose.logo.upload')"
										@click="logoInput?.click()"
									/>
									<input
										ref="logoInput"
										type="file"
										accept="image/svg+xml,image/png"
										:class="$style.hidden"
										@change="onLogoSelected"
									/>
								</div>
							</N8nInputLabel>
							<N8nInputLabel :label="i18n.baseText('customNodes.wizard.choose.auth')" :bold="false">
								<div :class="$style.authRow">
									<N8nSelect
										:model-value="draft.auth.kind"
										@update:model-value="
											(kind: string) =>
												(draft.auth =
													kind === 'none'
														? { kind: 'none' }
														: kind === 'generic'
															? { kind: 'generic', type: 'httpHeaderAuth' }
															: { kind: 'predefined', credentialType: '' })
										"
									>
										<N8nOption value="none" :label="i18n.baseText('customNodes.wizard.choose.auth.none')" />
										<N8nOption value="generic" :label="i18n.baseText('customNodes.wizard.choose.auth.generic')" />
										<N8nOption
											value="predefined"
											:label="i18n.baseText('customNodes.wizard.choose.auth.predefined')"
										/>
									</N8nSelect>
									<N8nSelect v-if="draft.auth.kind === 'generic'" v-model="draft.auth.type">
										<N8nOption
											v-for="option in GENERIC_AUTH_TYPES"
											:key="option.value"
											:value="option.value"
											:label="option.label"
										/>
									</N8nSelect>
									<N8nSelect
										v-if="draft.auth.kind === 'predefined'"
										v-model="draft.auth.credentialType"
										filterable
										:placeholder="i18n.baseText('customNodes.wizard.choose.auth.credentialType')"
									>
										<N8nOption
											v-for="type in predefinedCredentialTypes"
											:key="type.name"
											:value="type.name"
											:label="type.displayName"
										/>
									</N8nSelect>
								</div>
							</N8nInputLabel>
						</div>
					</template>

					<div :class="$style.grid2">
						<N8nInputLabel :label="i18n.baseText('customNodes.wizard.choose.operationName')" :bold="false">
							<N8nInput
								v-model="draft.operationName"
								:placeholder="i18n.baseText('customNodes.wizard.choose.operationName.placeholder')"
								data-test-id="custom-node-operation-name"
							/>
						</N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('generic.description')" :bold="false">
							<N8nInput v-model="draft.operationDescription" />
						</N8nInputLabel>
					</div>
				</div>

				<!-- 2. request -->
				<div v-else-if="step === 'request'" :class="$style.body">
					<div :class="$style.curlRow">
						<N8nInput
							v-model="curlCommand"
							type="textarea"
							:rows="1"
							:placeholder="i18n.baseText('customNodes.wizard.request.importCurl.placeholder')"
						/>
						<N8nButton
							variant="outline"
							size="small"
							icon="download"
							:disabled="!curlCommand.trim()"
							:label="i18n.baseText('customNodes.wizard.request.importCurl')"
							@click="importCurl"
						/>
					</div>
					<N8nText v-if="curlError" size="small" color="danger">{{ curlError }}</N8nText>

					<div :class="$style.requestLine">
						<N8nSelect v-model="draft.method" :class="$style.method" data-test-id="custom-node-method">
							<N8nOption v-for="method in METHODS" :key="method" :value="method" :label="method" />
						</N8nSelect>
						<N8nInput
							v-model="draft.url"
							:placeholder="i18n.baseText('customNodes.wizard.request.url')"
							data-test-id="custom-node-url"
						/>
					</div>
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('customNodes.wizard.request.url.hint') }}
					</N8nText>

					<div v-for="target in (['header', 'query', 'body'] as DraftEntryTarget[])" :key="target" :class="$style.entryGroup">
						<div :class="$style.entryHeader">
							<N8nText bold size="small">
								{{ i18n.baseText(`customNodes.wizard.request.${target === 'header' ? 'headers' : target}`) }}
							</N8nText>
							<N8nSelect
								v-if="target === 'body'"
								v-model="draft.bodyType"
								size="small"
								:class="$style.bodyType"
							>
								<N8nOption value="none" :label="i18n.baseText('customNodes.wizard.request.bodyType.none')" />
								<N8nOption value="json" :label="i18n.baseText('customNodes.wizard.request.bodyType.json')" />
								<N8nOption value="form" :label="i18n.baseText('customNodes.wizard.request.bodyType.form')" />
							</N8nSelect>
							<N8nButton
								variant="subtle"
								size="small"
								icon="plus"
								:disabled="target === 'body' && draft.bodyType === 'none'"
								:label="i18n.baseText('customNodes.wizard.request.addEntry')"
								@click="addEntry(target)"
							/>
						</div>
						<div
							v-for="entry in entriesByTarget(target)"
							:key="entry.id"
							:class="$style.entryRow"
						>
							<N8nInput
								v-model="entry.key"
								size="small"
								:placeholder="i18n.baseText('customNodes.wizard.request.key')"
								@blur="onEntryKeyChange(entry)"
							/>
							<N8nInput
								v-model="entry.value"
								size="small"
								:placeholder="i18n.baseText('customNodes.wizard.request.value')"
							/>
							<N8nIconButton icon="trash-2" variant="subtle" size="small" @click="removeEntry(entry)" />
						</div>
					</div>
				</div>

				<!-- 3. fields -->
				<div v-else-if="step === 'fields'" :class="$style.body">
					<N8nText size="small" color="text-light">{{ i18n.baseText('customNodes.wizard.fields.intro') }}</N8nText>
					<table v-if="draft.entries.length" :class="$style.table" data-test-id="custom-node-fields-table">
						<thead>
							<tr>
								<th>{{ i18n.baseText('customNodes.wizard.fields.column.target') }}</th>
								<th>{{ i18n.baseText('customNodes.wizard.fields.column.key') }}</th>
								<th>{{ i18n.baseText('customNodes.wizard.fields.column.mode') }}</th>
								<th>{{ i18n.baseText('customNodes.wizard.fields.column.displayName') }}</th>
								<th>{{ i18n.baseText('customNodes.wizard.fields.column.type') }}</th>
								<th>{{ i18n.baseText('customNodes.wizard.fields.column.value') }}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="entry in draft.entries" :key="entry.id">
								<td><N8nBadge theme="tertiary" size="small">{{ entry.target }}</N8nBadge></td>
								<td>
									<N8nInput v-model="entry.key" size="small" :disabled="entry.target === 'url'" />
								</td>
								<td>
									<N8nSelect v-model="entry.mode" size="small" :disabled="entry.target === 'url'">
										<N8nOption value="fixed" :label="i18n.baseText('customNodes.wizard.fields.mode.fixed')" />
										<N8nOption value="required" :label="i18n.baseText('customNodes.wizard.fields.mode.required')" />
										<N8nOption value="optional" :label="i18n.baseText('customNodes.wizard.fields.mode.optional')" />
									</N8nSelect>
								</td>
								<td>
									<N8nInput v-model="entry.displayName" size="small" :disabled="entry.mode === 'fixed'" />
								</td>
								<td>
									<N8nSelect v-model="entry.type" size="small" :disabled="entry.mode === 'fixed'">
										<N8nOption v-for="type in INPUT_TYPES" :key="type" :value="type" :label="type" />
									</N8nSelect>
								</td>
								<td>
									<N8nInput
										v-if="entry.type === 'options' && entry.mode !== 'fixed'"
										v-model="entry.optionsText"
										size="small"
										placeholder="Label=value, Label=value"
									/>
									<N8nInput v-else v-model="entry.value" size="small" />
								</td>
								<td>
									<N8nIconButton icon="trash-2" variant="subtle" size="small" @click="removeEntry(entry)" />
								</td>
							</tr>
						</tbody>
					</table>
					<N8nText v-else size="small">{{ i18n.baseText('customNodes.wizard.fields.empty') }}</N8nText>
					<div>
						<N8nButton
							variant="outline"
							size="small"
							icon="plus"
							:label="i18n.baseText('customNodes.wizard.fields.addInput')"
							@click="addEntry('url')"
						/>
					</div>
				</div>

				<!-- 4. review -->
				<div v-else :class="$style.body">
					<N8nNotice
						theme="success"
						:content="
							draft.mode === 'operation'
								? i18n.baseText('customNodes.wizard.review.summary.operation', {
										interpolate: {
											name: draft.operationName,
											node: parentDescription?.displayName ?? '',
										},
									})
								: i18n.baseText('customNodes.wizard.review.summary.node', {
										interpolate: { name: draft.nodeDisplayName, count: '1' },
									})
						"
					/>
					<div :class="$style.reviewGrid">
						<div>
							<N8nText bold size="small">{{ i18n.baseText('customNodes.wizard.review.request') }}</N8nText>
							<pre :class="$style.code">{{ draft.method }} {{ draft.url }}
{{ draft.entries.filter((e) => e.mode === 'fixed' && e.key).map((e) => `${e.target}: ${e.key} = ${e.value}`).join('\n') }}</pre>
						</div>
						<div>
							<N8nText bold size="small">{{ i18n.baseText('customNodes.wizard.review.parameters') }}</N8nText>
							<div v-if="previewLoading"><N8nText size="small">…</N8nText></div>
							<div v-else-if="previewParameters.length" :class="$style.previewList" data-test-id="custom-node-preview">
								<div v-for="property in previewParameters" :key="property.name" :class="$style.previewItem">
									<div :class="$style.previewLabel">
										<N8nText size="small" bold>{{ property.displayName }}</N8nText>
										<N8nBadge v-if="property.required" theme="warning" size="small">required</N8nBadge>
										<N8nText size="xsmall" color="text-light">{{ propertyTypeLabel(property) }}</N8nText>
									</div>
									<div v-if="property.type === 'collection'" :class="$style.previewCollection">
										<N8nText
											v-for="option in collectionOptions(property)"
											:key="option.name"
											size="xsmall"
											color="text-light"
										>
											· {{ option.displayName }} ({{ option.type }})
										</N8nText>
									</div>
									<N8nInput
										v-else
										size="small"
										disabled
										:model-value="String(property.default ?? '')"
									/>
								</div>
							</div>
							<N8nText v-else size="small" color="text-light">
								{{ i18n.baseText('customNodes.wizard.review.noParameters') }}
							</N8nText>
						</div>
					</div>
					<N8nInputLabel
						v-if="isEditing"
						:label="i18n.baseText('customNodes.wizard.review.changelog')"
						:bold="false"
					>
						<N8nInput
							v-model="draft.changelog"
							:placeholder="i18n.baseText('customNodes.wizard.review.changelog.placeholder')"
						/>
					</N8nInputLabel>
					<N8nText size="xsmall" color="text-light">{{ i18n.baseText('customNodes.wizard.review.intro') }}</N8nText>
				</div>

				<N8nText v-if="error" size="small" color="danger">{{ error }}</N8nText>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="stepIndex > 0"
					variant="outline"
					:label="i18n.baseText('generic.back')"
					@click="goBack"
				/>
				<span :class="$style.spacer" />
				<N8nButton
					v-if="step !== 'review'"
					:label="i18n.baseText('generic.next')"
					data-test-id="custom-node-wizard-next"
					@click="goNext"
				/>
				<N8nButton
					v-else
					:loading="saving"
					:label="
						isEditing
							? i18n.baseText('customNodes.wizard.save.newVersion')
							: i18n.baseText('customNodes.wizard.save.create')
					"
					data-test-id="custom-node-wizard-save"
					@click="save"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.wizard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 420px;
}

.steps {
	display: flex;
	gap: var(--spacing--sm);
	border-bottom: var(--border);
	padding-bottom: var(--spacing--xs);
}

.step {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	opacity: 0.55;
}

.step.active,
.step.done {
	opacity: 1;
}

.step.done {
	cursor: pointer;
}

.stepNumber {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--color--foreground);
	font-size: var(--font-size--2xs);
}

.active .stepNumber {
	background: var(--color--primary);
	color: var(--color--text--tint-3);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.modeCards {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}

.modeCard {
	cursor: pointer;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.modeCardActive {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 1px var(--color--primary);
}

.grid2 {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.logoRow,
.authRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.logoPreview {
	width: 32px;
	height: 32px;
	object-fit: contain;
}

.hidden {
	display: none;
}

.curlRow {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-start;
}

.requestLine {
	display: flex;
	gap: var(--spacing--2xs);
}

.method {
	width: 130px;
	flex: none;
}

.entryGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.entryHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.bodyType {
	width: 180px;
}

.entryRow {
	display: grid;
	grid-template-columns: 1fr 2fr auto;
	gap: var(--spacing--2xs);
}

.table {
	width: 100%;
	border-collapse: collapse;

	th {
		text-align: left;
		font-size: var(--font-size--2xs);
		color: var(--color--text--tint-1);
		padding: var(--spacing--3xs);
	}

	td {
		padding: var(--spacing--3xs);
		vertical-align: middle;
	}
}

.reviewGrid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}

.code {
	font-size: var(--font-size--2xs);
	background: var(--color--background--light-2);
	padding: var(--spacing--xs);
	border-radius: var(--radius);
	white-space: pre-wrap;
	word-break: break-all;
}

.previewList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--xs);
}

.previewItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.previewLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.previewCollection {
	display: flex;
	flex-direction: column;
	padding-left: var(--spacing--xs);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.spacer {
	flex: 1;
}
</style>
