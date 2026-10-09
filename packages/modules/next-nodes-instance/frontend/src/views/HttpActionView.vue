<script setup lang="ts">
import type { NextNodeDraftTestResult } from '@n8n/api-types';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useStorage } from '@n8n/composables/useStorage';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nCollapsiblePanel,
	N8nInput,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsSection,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import OpenApiImportModal from '../components/OpenApiImportModal.vue';
import RequestRows from '../components/RequestRows.vue';
import TestPanel from '../components/TestPanel.vue';
import {
	actionIdOf,
	configOf,
	credentialTypesOf,
	formOfConfig,
	emptyForm,
	flowOf,
	holesOf,
	INPUT_TYPES,
	isEffect,
	isInputType,
	isMethod,
	inputNamesOf,
	inputSettingsOf,
	isNodeInput,
	issuesOf,
	METHODS,
	testedPartOf,
	testParamsOf,
	trimmedSchemaOf,
	type HttpActionForm,
	type InputSettings,
	type JsonSchema,
	type Paging,
	type ResponseShape,
	usableCredentialTypesOf,
	type ValueRow,
} from '../next-nodes-instance.config';
import { NODES_SETTINGS_VIEW } from '../next-nodes-instance.constants';
import { HTTP_ACTION_DRAFT_KEY } from '../next-nodes-instance.request';
import { useNextNodesInstanceStore } from '../next-nodes-instance.store';

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const rbac = useRBACStore();
const store = useNextNodesInstanceStore();

const route = useRoute();
/** The action whose next version the form makes. Absent: a new action. */
const editing = typeof route.params.actionId === 'string' ? route.params.actionId : undefined;

// The server keeps published versions only, so an unpublished action lives in this browser.
const saved = useStorage(editing ? `${HTTP_ACTION_DRAFT_KEY}:${editing}` : HTTP_ACTION_DRAFT_KEY);

const isForm = (value: unknown): value is HttpActionForm =>
	typeof value === 'object' && value !== null && 'appName' in value && 'path' in value;

function savedForm(): HttpActionForm {
	try {
		const parsed: unknown = JSON.parse(saved.value ?? 'null');
		return isForm(parsed) ? { ...emptyForm(), ...parsed } : emptyForm();
	} catch {
		return emptyForm();
	}
}

const form = ref<HttpActionForm>(savedForm());
watch(form, (value) => (saved.value = JSON.stringify(value)), { deep: true });

const set = (change: Partial<HttpActionForm>) => (form.value = { ...form.value, ...change });
const setAdvanced = (change: HttpActionForm['advanced']) =>
	set({ advanced: { ...form.value.advanced, ...change } });

const config = computed(() => configOf(form.value));
const issues = computed(() => issuesOf(form.value));
const derivedFlow = computed(() => flowOf(form.value.method));

const inputs = computed(() =>
	inputNamesOf(form.value).map((name) => [name, inputSettingsOf(form.value, name)] as const),
);
const isPathInput = (name: string) => holesOf(form.value.path).includes(name);
const setInput = (name: string, change: Partial<InputSettings>) =>
	set({
		inputs: { ...form.value.inputs, [name]: { ...inputSettingsOf(form.value, name), ...change } },
	});

const headerRows = computed<ValueRow[]>(() =>
	form.value.headers.map(({ key, value }) => ({ key, value, fromInput: false })),
);
const setHeaders = (rows: ValueRow[]) =>
	set({ headers: rows.map(({ key, value }) => ({ key, value })) });

const responseOptions = computed(() => [
	{ label: i18n.baseText('settings.nodes.form.response.single'), value: 'single' },
	{ label: i18n.baseText('settings.nodes.form.response.list'), value: 'list' },
]);
const setResponseKind = (kind: string | boolean) =>
	set({ response: kind === 'list' ? { kind: 'list', items: '' } : { kind: 'single' } });
const setResponse = (change: Partial<Extract<ResponseShape, { kind: 'list' }>>) => {
	const response = form.value.response;
	if (response.kind === 'list') set({ response: { ...response, ...change } });
};

const PAGING_STYLES = ['none', 'cursor', 'link', 'offsetItem', 'offsetPage'] as const;
type PagingStyle = (typeof PAGING_STYLES)[number];

const isPagingStyle = (value: unknown): value is PagingStyle =>
	PAGING_STYLES.some((style) => style === value);

const pagingStyleOf = (paging: Paging | undefined): PagingStyle => {
	if (!paging) return 'none';
	if (paging.style === 'offset') return paging.unit === 'item' ? 'offsetItem' : 'offsetPage';
	return paging.style;
};
const paging = computed(() =>
	form.value.response.kind === 'list' ? form.value.response.paging : undefined,
);
const pagingStyle = computed(() => pagingStyleOf(paging.value));
const pageSend = computed(() =>
	paging.value && 'send' in paging.value ? paging.value.send : { query: '' },
);
const pageSendIn = computed(() => ('body' in pageSend.value ? 'body' : 'query'));
const pageParam = computed(() =>
	'body' in pageSend.value ? pageSend.value.body : pageSend.value.query,
);

function setPaging(style: PagingStyle, send = pageSend.value, next = '') {
	const nextOf = paging.value?.style === 'cursor' ? paging.value.next : next;
	const pagingOf: Record<PagingStyle, Paging | undefined> = {
		none: undefined,
		cursor: { style: 'cursor', next: next || nextOf, send },
		link: { style: 'link' },
		offsetItem: { style: 'offset', unit: 'item', send },
		offsetPage: { style: 'offset', unit: 'page', send },
	};
	setResponse({ paging: pagingOf[style] });
}
const setPageParam = (where: string, name: string) =>
	setPaging(pagingStyle.value, where === 'body' ? { body: name } : { query: name });

const catalog = capabilityRegistry.use(capabilities.credentialCatalog);
const credentialTypes = computed(() => usableCredentialTypesOf(catalog.types()));
const testCredentialTypes = computed(() =>
	credentialTypesOf(form.value).map((name) => ({
		name,
		displayName: catalog.types().find((type) => type.name === name)?.displayName ?? name,
	})),
);

const parent = computed(() => store.parents.find(({ id }) => id === form.value.extends?.node));
const parentName = computed(() => form.value.extends?.displayName ?? '');
const setParent = (value: unknown) => {
	const picked = store.parents.find(({ id }) => id === value);
	credentialId.value = null;
	set({
		extends: picked && {
			node: picked.id,
			displayName: picked.displayName,
			credentialTypes: picked.credentialTypes,
			resourceFields: [],
		},
	});
};
const setResource = (value: unknown) => {
	const current = form.value.extends;
	if (!current) return;
	const resource = typeof value === 'string' && value ? value : undefined;
	set({
		extends: {
			...current,
			resource,
			resourceFields: (resource && parent.value?.resources[resource]) || [],
		},
	});
};
// The credential is the tester's own, so the draft does not keep it.
const credentialId = ref<string | null>(null);
const setCredentialType = (value: unknown) => {
	credentialId.value = null;
	set({ credentialType: typeof value === 'string' && value ? value : undefined });
};

const editedSemver = ref<string>();
const title = computed(() =>
	editing
		? i18n.baseText('settings.nodes.form.editTitle', {
				interpolate: { name: form.value.actionName },
			})
		: i18n.baseText('settings.nodes.form.title'),
);

const running = ref(false);
const result = ref<NextNodeDraftTestResult>();
const testedPart = ref<string>();
const keep = ref<Set<string>>(new Set());

const isSchema = (value: unknown): value is JsonSchema =>
	typeof value === 'object' && value !== null;
const schema = computed(() =>
	isSchema(result.value?.outputSchema) ? result.value.outputSchema : undefined,
);
const outdated = computed(() => testedPart.value !== testedPartOf(config.value));

async function runTest(values: Record<string, string>) {
	running.value = true;
	try {
		const tested = config.value;
		result.value = await store.test(
			tested,
			testParamsOf(form.value, values),
			credentialId.value ?? undefined,
		);
		testedPart.value = testedPartOf(tested);
		// The next version of an action keeps the fields that its last version kept.
		const kept = form.value.output?.properties;
		keep.value = new Set(
			Object.keys(schema.value?.properties ?? {}).filter((name) => !kept || name in kept),
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.nodes.test.error'));
	} finally {
		running.value = false;
	}
}

const canPublish = computed(() => rbac.hasScope('nodeDefinition:publish'));
const publishBlocker = computed(() =>
	canPublish.value ? undefined : i18n.baseText('settings.nodes.form.publish.needsScope'),
);

const publishing = ref(false);
const importOpen = ref(false);

async function publish() {
	if (publishBlocker.value) return;
	// A test run of the current request gives the fixture and the output that the user trimmed.
	const fixture =
		result.value?.status === 'success' && !outdated.value ? result.value.fixture : undefined;
	publishing.value = true;
	try {
		const output =
			fixture && schema.value
				? trimmedSchemaOf(schema.value, keep.value)
				: config.value.contract.output;
		const published = await store.publish(
			{ ...config.value, contract: { ...config.value.contract, output } },
			fixture,
		);
		toast.showMessage({
			title: i18n.baseText('settings.nodes.form.publish.success', {
				interpolate: { version: published.semver },
			}),
			type: 'success',
		});
		saved.value = null;
		await router.push({ name: NODES_SETTINGS_VIEW });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.nodes.form.publish.error'));
	} finally {
		publishing.value = false;
	}
}

const goBack = async () => await router.push({ name: NODES_SETTINGS_VIEW });

const advancedOpen = ref(false);

onMounted(async () => {
	useDocumentTitle().set(title.value);
	try {
		await Promise.all([catalog.load(), store.fetchParents()]);
		if (editing && saved.value === null) {
			const { semver, config } = await store.configOf(editing);
			form.value = formOfConfig(config, store.parents);
			editedSemver.value = semver;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.nodes.form.auth.loadError'));
	}
});
</script>

<template>
	<N8nSettingsLayout
		full-width
		show-back
		:back-label="i18n.baseText('settings.nodes')"
		@back="goBack"
	>
		<div :class="$style.page">
			<N8nSettingsPageHeader :title="title" :show-docs-link="false">
				<template v-if="!editing && canPublish" #titleTrailing>
					<N8nButton
						variant="outline"
						data-test-id="http-action-import-openapi"
						@click="importOpen = true"
					>
						<template #icon><N8nIcon icon="file-import" /></template>
						{{ i18n.baseText('settings.nodes.openApi.open') }}
					</N8nButton>
				</template>
			</N8nSettingsPageHeader>
			<OpenApiImportModal v-model:open="importOpen" @done="goBack" />

			<N8nText v-if="editedSemver" size="small" color="text-light">
				{{
					i18n.baseText('settings.nodes.form.editing', { interpolate: { version: editedSemver } })
				}}
			</N8nText>

			<div :class="$style.columns">
				<div :class="$style.form">
					<N8nSettingsSection :title="i18n.baseText('settings.nodes.form.about')">
						<div :class="$style.pair">
							<N8nInputLabel
								input-name="http-action-field-extends"
								:label="i18n.baseText('settings.nodes.form.extends')"
								:tooltip-text="i18n.baseText('settings.nodes.form.extends.hint')"
							>
								<N8nSelect
									id="http-action-field-extends"
									:model-value="form.extends?.node ?? ''"
									:disabled="!!editing"
									filterable
									data-test-id="http-action-extends"
									@update:model-value="setParent"
								>
									<N8nOption value="" :label="i18n.baseText('settings.nodes.form.extends.none')" />
									<N8nOption
										v-for="node in store.parents"
										:key="node.id"
										:value="node.id"
										:label="node.displayName"
									/>
								</N8nSelect>
							</N8nInputLabel>
							<N8nInputLabel
								v-if="form.extends"
								input-name="http-action-field-resource"
								:label="i18n.baseText('settings.nodes.form.resource')"
							>
								<N8nSelect
									id="http-action-field-resource"
									:model-value="form.extends.resource ?? ''"
									:disabled="!!editing"
									data-test-id="http-action-resource"
									@update:model-value="setResource"
								>
									<N8nOption value="" :label="i18n.baseText('settings.nodes.form.resource.none')" />
									<N8nOption
										v-for="resource in Object.keys(parent?.resources ?? {})"
										:key="resource"
										:value="resource"
										:label="resource"
									/>
								</N8nSelect>
							</N8nInputLabel>
						</div>
						<div :class="$style.pair">
							<N8nInputLabel
								v-if="!form.extends"
								input-name="http-action-field-appName"
								:label="i18n.baseText('settings.nodes.form.appName')"
								:tooltip-text="i18n.baseText('settings.nodes.form.appName.hint')"
								required
							>
								<N8nInput
									id="http-action-field-appName"
									:model-value="form.appName"
									:placeholder="i18n.baseText('settings.nodes.form.appName.placeholder')"
									data-test-id="http-action-app-name"
									@update:model-value="set({ appName: $event })"
								/>
							</N8nInputLabel>
							<N8nInputLabel
								input-name="http-action-field-actionName"
								:label="i18n.baseText('settings.nodes.form.actionName')"
								required
							>
								<N8nInput
									id="http-action-field-actionName"
									:model-value="form.actionName"
									:placeholder="i18n.baseText('settings.nodes.form.actionName.placeholder')"
									data-test-id="http-action-action-name"
									@update:model-value="set({ actionName: $event })"
								/>
							</N8nInputLabel>
						</div>
						<N8nInputLabel
							input-name="http-action-field-summary"
							:label="i18n.baseText('settings.nodes.form.summary')"
						>
							<N8nInput
								id="http-action-field-summary"
								:model-value="form.summary"
								:placeholder="i18n.baseText('settings.nodes.form.summary.placeholder')"
								@update:model-value="set({ summary: $event })"
							/>
						</N8nInputLabel>
					</N8nSettingsSection>

					<N8nSettingsSection :title="i18n.baseText('settings.nodes.form.request')">
						<div :class="$style.url">
							<N8nInputLabel
								input-name="http-action-field-method"
								:label="i18n.baseText('settings.nodes.form.method')"
							>
								<N8nSelect
									id="http-action-field-method"
									:model-value="form.method"
									data-test-id="http-action-method"
									@update:model-value="isMethod($event) && set({ method: $event })"
								>
									<N8nOption
										v-for="method in METHODS"
										:key="method"
										:value="method"
										:label="method"
									/>
								</N8nSelect>
							</N8nInputLabel>
							<N8nText v-if="form.extends" size="small" color="text-base" :class="$style.inherited">
								{{
									i18n.baseText('settings.nodes.form.extends.baseUrl', {
										interpolate: { app: parentName },
									})
								}}
							</N8nText>
							<N8nInputLabel
								v-else
								input-name="http-action-field-baseUrl"
								:label="i18n.baseText('settings.nodes.form.baseUrl')"
								required
							>
								<N8nInput
									id="http-action-field-baseUrl"
									:model-value="form.baseUrl"
									:placeholder="i18n.baseText('settings.nodes.form.baseUrl.placeholder')"
									data-test-id="http-action-base-url"
									@update:model-value="set({ baseUrl: $event })"
								/>
							</N8nInputLabel>
						</div>
						<N8nInputLabel
							input-name="http-action-field-path"
							:label="i18n.baseText('settings.nodes.form.path')"
							:tooltip-text="i18n.baseText('settings.nodes.form.path.hint')"
							required
						>
							<N8nInput
								id="http-action-field-path"
								:model-value="form.path"
								:placeholder="i18n.baseText('settings.nodes.form.path.placeholder')"
								data-test-id="http-action-path"
								@update:model-value="set({ path: $event })"
							/>
						</N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('settings.nodes.form.query')">
							<RequestRows
								:rows="form.query"
								with-input
								:add-label="i18n.baseText('settings.nodes.form.row.add')"
								test-id="http-action-query"
								@update:rows="set({ query: $event })"
							/>
						</N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('settings.nodes.form.headers')">
							<RequestRows
								:rows="headerRows"
								:with-input="false"
								:add-label="i18n.baseText('settings.nodes.form.row.addHeader')"
								test-id="http-action-headers"
								@update:rows="setHeaders"
							/>
						</N8nInputLabel>
						<N8nInputLabel
							v-if="form.method !== 'GET' && form.method !== 'HEAD'"
							:label="i18n.baseText('settings.nodes.form.body')"
						>
							<RequestRows
								:rows="form.body"
								with-input
								:add-label="i18n.baseText('settings.nodes.form.row.add')"
								test-id="http-action-body"
								@update:rows="set({ body: $event })"
							/>
						</N8nInputLabel>
					</N8nSettingsSection>

					<N8nSettingsSection
						:title="i18n.baseText('settings.nodes.form.auth')"
						:description="i18n.baseText('settings.nodes.form.auth.description')"
					>
						<N8nText v-if="form.extends" size="small" color="text-base">
							{{
								i18n.baseText('settings.nodes.form.extends.auth', {
									interpolate: { app: parentName },
								})
							}}
						</N8nText>
						<N8nInputLabel
							v-else
							input-name="http-action-field-credentialType"
							:label="i18n.baseText('settings.nodes.form.auth.type')"
						>
							<N8nSelect
								id="http-action-field-credentialType"
								:model-value="form.credentialType ?? ''"
								filterable
								:placeholder="i18n.baseText('settings.nodes.form.auth.placeholder')"
								data-test-id="http-action-credential-type"
								@update:model-value="setCredentialType"
							>
								<N8nOption value="" :label="i18n.baseText('settings.nodes.form.auth.none')" />
								<N8nOption
									v-for="type in credentialTypes"
									:key="type.name"
									:value="type.name"
									:label="type.displayName"
								/>
							</N8nSelect>
						</N8nInputLabel>
					</N8nSettingsSection>

					<N8nSettingsSection
						:title="i18n.baseText('settings.nodes.form.inputs')"
						:description="i18n.baseText('settings.nodes.form.inputs.description')"
					>
						<N8nText v-if="!inputs.length" size="small" color="text-light">
							{{ i18n.baseText('settings.nodes.form.inputs.empty') }}
						</N8nText>
						<div
							v-for="[name, settings] in inputs"
							:key="name"
							:class="$style.input"
							:data-test-id="`http-action-input-${name}`"
						>
							<N8nText bold>{{ name }}</N8nText>
							<N8nText
								v-if="isNodeInput(form, name)"
								size="small"
								color="text-light"
								:class="$style.wide"
							>
								{{
									i18n.baseText('settings.nodes.form.input.fromNode', {
										interpolate: { app: parentName },
									})
								}}
							</N8nText>
							<template v-else>
								<N8nSelect
									:model-value="settings.type"
									size="small"
									:aria-label="i18n.baseText('settings.nodes.form.input.type')"
									@update:model-value="isInputType($event) && setInput(name, { type: $event })"
								>
									<N8nOption
										v-for="type in INPUT_TYPES"
										:key="type"
										:value="type"
										:label="i18n.baseText(`settings.nodes.form.input.type.${type}`)"
									/>
								</N8nSelect>
								<N8nTooltip
									:disabled="!isPathInput(name)"
									:content="i18n.baseText('settings.nodes.form.input.required.path')"
								>
									<N8nCheckbox
										:model-value="settings.required"
										:disabled="isPathInput(name)"
										:label="i18n.baseText('settings.nodes.form.input.required')"
										@update:model-value="setInput(name, { required: $event })"
									/>
								</N8nTooltip>
								<N8nInput
									:model-value="settings.description"
									size="small"
									:placeholder="i18n.baseText('settings.nodes.form.input.description')"
									:aria-label="i18n.baseText('settings.nodes.form.input.description')"
									@update:model-value="setInput(name, { description: $event })"
								/>
							</template>
						</div>
					</N8nSettingsSection>

					<N8nSettingsSection :title="i18n.baseText('settings.nodes.form.response')">
						<N8nSegmentControl
							:model-value="form.response.kind"
							:options="responseOptions"
							data-test-id="http-action-response-kind"
							@update:model-value="setResponseKind"
						/>
						<N8nInputLabel
							input-name="http-action-field-response-items"
							v-if="form.response.kind === 'list'"
							:label="i18n.baseText('settings.nodes.form.response.items')"
							:tooltip-text="i18n.baseText('settings.nodes.form.response.items.hint')"
						>
							<N8nInput
								id="http-action-field-response-items"
								:model-value="form.response.items"
								:placeholder="i18n.baseText('settings.nodes.form.response.items.placeholder')"
								data-test-id="http-action-items"
								@update:model-value="setResponse({ items: $event })"
							/>
						</N8nInputLabel>
					</N8nSettingsSection>

					<N8nCollapsiblePanel
						v-model="advancedOpen"
						:title="i18n.baseText('settings.nodes.form.advanced')"
					>
						<div :class="$style.advanced">
							<N8nInputLabel
								input-name="http-action-field-id"
								:label="i18n.baseText('settings.nodes.form.id')"
								:tooltip-text="i18n.baseText('settings.nodes.form.id.hint')"
							>
								<N8nInput
									id="http-action-field-id"
									:model-value="actionIdOf(form)"
									:disabled="!!editing"
									data-test-id="http-action-id"
									@update:model-value="setAdvanced({ id: $event || undefined })"
								/>
							</N8nInputLabel>
							<div :class="$style.pair">
								<N8nInputLabel
									input-name="http-action-field-effect"
									:label="i18n.baseText('settings.nodes.form.effect')"
								>
									<N8nSelect
										id="http-action-field-effect"
										:model-value="form.advanced.effect ?? derivedFlow.effect"
										@update:model-value="isEffect($event) && setAdvanced({ effect: $event })"
									>
										<N8nOption
											value="read"
											:label="i18n.baseText('settings.nodes.form.effect.read')"
										/>
										<N8nOption
											value="write"
											:label="i18n.baseText('settings.nodes.form.effect.write')"
										/>
									</N8nSelect>
								</N8nInputLabel>
								<N8nTooltip :content="i18n.baseText('settings.nodes.form.idempotent.hint')">
									<N8nCheckbox
										:model-value="form.advanced.idempotent ?? derivedFlow.idempotent"
										:label="i18n.baseText('settings.nodes.form.idempotent')"
										@update:model-value="setAdvanced({ idempotent: $event })"
									/>
								</N8nTooltip>
							</div>
							<template v-if="form.response.kind === 'list'">
								<N8nInputLabel
									input-name="http-action-field-paging"
									:label="i18n.baseText('settings.nodes.form.paging')"
								>
									<N8nSelect
										id="http-action-field-paging"
										:model-value="pagingStyle"
										data-test-id="http-action-paging"
										@update:model-value="isPagingStyle($event) && setPaging($event)"
									>
										<N8nOption
											v-for="style in PAGING_STYLES"
											:key="style"
											:value="style"
											:label="i18n.baseText(`settings.nodes.form.paging.${style}`)"
										/>
									</N8nSelect>
								</N8nInputLabel>
								<N8nInputLabel
									input-name="http-action-field-paging-next"
									v-if="paging?.style === 'cursor'"
									:label="i18n.baseText('settings.nodes.form.paging.next')"
								>
									<N8nInput
										id="http-action-field-paging-next"
										:model-value="paging.next"
										:placeholder="i18n.baseText('settings.nodes.form.paging.next.placeholder')"
										@update:model-value="setPaging('cursor', pageSend, $event)"
									/>
								</N8nInputLabel>
								<div v-if="paging && 'send' in paging" :class="$style.pair">
									<N8nInputLabel
										input-name="http-action-field-paging-send"
										:label="i18n.baseText('settings.nodes.form.paging.send')"
									>
										<N8nSelect
											id="http-action-field-paging-send"
											:model-value="pageSendIn"
											@update:model-value="
												setPageParam($event === 'body' ? 'body' : 'query', pageParam)
											"
										>
											<N8nOption
												value="query"
												:label="i18n.baseText('settings.nodes.form.paging.send.query')"
											/>
											<N8nOption
												value="body"
												:label="i18n.baseText('settings.nodes.form.paging.send.body')"
											/>
										</N8nSelect>
									</N8nInputLabel>
									<N8nInputLabel
										input-name="http-action-field-paging-param"
										:label="i18n.baseText('settings.nodes.form.paging.param')"
									>
										<N8nInput
											id="http-action-field-paging-param"
											:model-value="pageParam"
											:placeholder="i18n.baseText('settings.nodes.form.paging.param.placeholder')"
											@update:model-value="setPageParam(pageSendIn, $event)"
										/>
									</N8nInputLabel>
								</div>
							</template>
						</div>
					</N8nCollapsiblePanel>
				</div>

				<div :class="$style.side">
					<N8nCallout v-if="issues.length" theme="secondary" data-test-id="http-action-issues">
						<ul :class="$style.issues">
							<li v-for="issue in issues" :key="issue">
								{{ i18n.baseText(`settings.nodes.form.issue.${issue}`) }}
							</li>
						</ul>
					</N8nCallout>
					<TestPanel
						:inputs="inputs"
						:result="result"
						:schema="schema"
						:keep="keep"
						:running="running"
						:outdated="outdated"
						:disabled="issues.length > 0"
						:credential-types="testCredentialTypes"
						:app-name="form.extends?.displayName ?? form.appName"
						:credential-id="credentialId"
						@update:credential-id="credentialId = $event"
						@run="runTest"
						@update:keep="keep = $event"
					/>
					<div :class="$style.publish">
						<N8nTooltip :disabled="!publishBlocker" :content="publishBlocker">
							<N8nButton
								:disabled="!!publishBlocker"
								:loading="publishing"
								data-test-id="http-action-publish"
								@click="publish"
							>
								{{
									editing
										? i18n.baseText('settings.nodes.form.publishVersion')
										: i18n.baseText('settings.nodes.form.publish')
								}}
							</N8nButton>
						</N8nTooltip>
					</div>
				</div>
			</div>
		</div>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.page {
	// The form and the test panel need two columns, so the page widens the settings cap. No
	// width token exists at this size.
	--settings-content--max-width: 75rem;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
	width: 100%;
	max-width: var(--settings-content--max-width);
	margin-inline: auto;
}

.columns {
	display: grid;
	grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
	align-items: start;
	gap: var(--spacing--xl);
}

.form,
.side,
.advanced {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.side {
	position: sticky;
	top: var(--spacing--md);
}

.pair {
	display: grid;
	grid-template-columns: 1fr 1fr;
	align-items: end;
	gap: var(--spacing--sm);
}

.url {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 4fr);
	gap: var(--spacing--sm);
}

.input {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto minmax(0, 2fr);
	align-items: center;
	gap: var(--spacing--xs);
}

.wide {
	grid-column: span 3;
}

.inherited {
	align-self: end;
}

.publish {
	display: flex;
	justify-content: flex-end;
}

.issues {
	margin: 0;
	padding-left: var(--spacing--sm);
}
</style>
