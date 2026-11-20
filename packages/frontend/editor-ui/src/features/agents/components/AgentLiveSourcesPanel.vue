<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type {
	AgentJsonLiveSourceConfig,
	AgentJsonLiveSourceItem,
	AgentLiveSourceRetrievalStrategy,
} from '@n8n/api-types';
import { LIVE_SOURCE_RETRIEVAL_STRATEGIES } from '@n8n/api-types';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';

import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { resolveAgentLiveSourceLink } from '../composables/useKnowledgeApi';
import {
	AGENT_LIVE_SOURCE_PROVIDERS,
	addResolvedLiveSourceItem,
	getLiveSourceProvider,
	removeLiveSource,
	removeLiveSourceItem,
	setLiveSourceRetrieval,
	type AgentLiveSourceProviderId,
} from '../live-sources';
import AgentCredentialSelect, { type AgentCredentialOption } from './AgentCredentialSelect.vue';

const props = withDefaults(
	defineProps<{
		liveSources: AgentJsonLiveSourceConfig[];
		projectId: string;
		agentId: string;
		disabled?: boolean;
	}>(),
	{
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:liveSources': [liveSources: AgentJsonLiveSourceConfig[]];
}>();

/** The select value that stands for "no override": `retrieval` is left out of the config. */
const RETRIEVAL_DEFAULT = 'default';

const PROVIDER_LABEL_KEYS: Record<AgentLiveSourceProviderId, BaseTextKey> = {
	notion: 'agents.builder.liveSources.provider.notion',
	slack: 'agents.builder.liveSources.provider.slack',
};

const LINK_PLACEHOLDER_KEYS: Record<AgentLiveSourceProviderId, BaseTextKey> = {
	notion: 'agents.builder.liveSources.form.linkPlaceholder.notion',
	slack: 'agents.builder.liveSources.form.linkPlaceholder.slack',
};

const RETRIEVAL_LABEL_KEYS: Record<AgentLiveSourceRetrievalStrategy, BaseTextKey> = {
	native: 'agents.builder.liveSources.retrieval.native',
	index: 'agents.builder.liveSources.retrieval.index',
};

const i18n = useI18n();
const rootStore = useRootStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();

const provider = ref<AgentLiveSourceProviderId>('notion');
const credential = ref('');
const url = ref('');
const resolving = ref(false);
const error = ref<string | null>(null);

const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
const credentialsLoading = ref(false);

const providerDefinition = computed(() => getLiveSourceProvider(provider.value));

const credentialOptions = computed<AgentCredentialOption[]>(() =>
	(providerDefinition.value?.credentialTypes ?? []).flatMap(
		(type) => credentialsByType.value[type] ?? [],
	),
);

const projectForPermissions = computed(() => {
	if (projectsStore.currentProject?.id === props.projectId) return projectsStore.currentProject;
	if (projectsStore.personalProject?.id === props.projectId) return projectsStore.personalProject;
	return projectsStore.myProjects.find((project) => project.id === props.projectId) ?? null;
});

// The stub offers no "create credential" flow: a tester creates one on the Credentials page.
const credentialPermissions = computed(() => ({
	...getResourcePermissions(projectForPermissions.value?.scopes).credential,
	create: false,
}));

const canAdd = computed(
	() => !props.disabled && !resolving.value && credential.value !== '' && url.value.trim() !== '',
);

function providerLabel(providerId: string): string {
	const definition = getLiveSourceProvider(providerId);
	return definition ? i18n.baseText(PROVIDER_LABEL_KEYS[definition.id]) : providerId;
}

function retrievalLabel(strategy: AgentLiveSourceRetrievalStrategy): string {
	return i18n.baseText(RETRIEVAL_LABEL_KEYS[strategy]);
}

function onProviderChange(value: unknown) {
	const definition = typeof value === 'string' ? getLiveSourceProvider(value) : undefined;
	if (definition) provider.value = definition.id;
}

/** The icon of a source: its credential's type, or the provider's preferred type when the credential is not loaded. */
function credentialTypeOf(source: AgentJsonLiveSourceConfig): string | null {
	return (
		credentialsStore.getCredentialById(source.credential)?.type ??
		getLiveSourceProvider(source.provider)?.credentialTypes[0] ??
		null
	);
}

async function loadCredentials() {
	credentialsLoading.value = true;
	try {
		const allCredentials = await credentialsStore.fetchUsableCredentials({
			projectId: props.projectId,
			forAgent: true,
		});
		const byType: Record<string, AgentCredentialOption[]> = {};
		for (const definition of AGENT_LIVE_SOURCE_PROVIDERS) {
			for (const type of definition.credentialTypes) {
				byType[type] = allCredentials
					.filter((candidate) => candidate.type === type)
					.map((candidate) => ({
						id: candidate.id,
						name: candidate.name,
						type: candidate.type,
						typeDisplayName: credentialsStore.getCredentialTypeByName(candidate.type)?.displayName,
						homeProject: candidate.homeProject,
					}));
			}
		}
		credentialsByType.value = byType;
	} finally {
		credentialsLoading.value = false;
	}
}

// A credential of another provider cannot stay selected; a single option is picked for the user.
watch(
	credentialOptions,
	(options) => {
		if (!options.some((option) => option.id === credential.value)) {
			credential.value = options.length === 1 ? options[0].id : '';
		}
	},
	{ immediate: true },
);

watch([provider, url], () => {
	error.value = null;
});

onMounted(async () => {
	await loadCredentials();
});

async function onAdd() {
	if (!canAdd.value) return;
	error.value = null;
	resolving.value = true;
	try {
		const { item } = await resolveAgentLiveSourceLink(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			{ provider: provider.value, credential: credential.value, url: url.value.trim() },
		);
		if (!item) {
			error.value = i18n.baseText('agents.builder.liveSources.form.unknownLink', {
				interpolate: { provider: providerLabel(provider.value) },
			});
			return;
		}
		const next = addResolvedLiveSourceItem(props.liveSources, {
			provider: provider.value,
			credential: credential.value,
			credentialName: credentialOptions.value.find((option) => option.id === credential.value)
				?.name,
			item,
		});
		if (next) emit('update:liveSources', next);
		url.value = '';
	} catch (caught) {
		error.value = caught instanceof Error ? caught.message : String(caught);
	} finally {
		resolving.value = false;
	}
}

function onRetrievalChange(source: AgentJsonLiveSourceConfig, value: string) {
	const retrieval = LIVE_SOURCE_RETRIEVAL_STRATEGIES.find((strategy) => strategy === value);
	emit('update:liveSources', setLiveSourceRetrieval(props.liveSources, source.id, retrieval));
}

function onRemoveSource(source: AgentJsonLiveSourceConfig) {
	emit('update:liveSources', removeLiveSource(props.liveSources, source.id));
}

function onRemoveItem(source: AgentJsonLiveSourceConfig, item: AgentJsonLiveSourceItem) {
	emit('update:liveSources', removeLiveSourceItem(props.liveSources, source.id, item.id));
}
</script>

<template>
	<div :class="$style.panel" data-testid="agent-live-sources-panel">
		<form :class="$style.form" @submit.prevent="onAdd">
			<div :class="$style.formRow">
				<N8nInputLabel
					:label="i18n.baseText('agents.builder.liveSources.form.provider')"
					size="small"
					:class="$style.providerField"
				>
					<N8nSelect
						:model-value="provider"
						size="small"
						:disabled="props.disabled || resolving"
						data-testid="agent-live-sources-provider"
						@update:model-value="onProviderChange"
					>
						<N8nOption
							v-for="definition in AGENT_LIVE_SOURCE_PROVIDERS"
							:key="definition.id"
							:value="definition.id"
							:label="providerLabel(definition.id)"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('agents.builder.liveSources.form.credential')"
					size="small"
					:class="$style.credentialField"
				>
					<AgentCredentialSelect
						v-model="credential"
						:credentials="credentialOptions"
						:placeholder="i18n.baseText('agents.builder.liveSources.form.credentialPlaceholder')"
						:credential-permissions="credentialPermissions"
						:loading="credentialsLoading"
						:disabled="props.disabled || resolving"
						data-test-id="agent-live-sources-credential"
					/>
				</N8nInputLabel>
			</div>
			<N8nText
				v-if="!credentialsLoading && credentialOptions.length === 0"
				size="small"
				color="text-light"
				data-testid="agent-live-sources-no-credentials"
			>
				{{
					i18n.baseText('agents.builder.liveSources.form.noCredentials', {
						interpolate: { provider: providerLabel(provider) },
					})
				}}
			</N8nText>
			<N8nInputLabel :label="i18n.baseText('agents.builder.liveSources.form.link')" size="small">
				<div :class="$style.linkRow">
					<N8nInput
						v-model="url"
						size="small"
						:placeholder="i18n.baseText(LINK_PLACEHOLDER_KEYS[provider])"
						:disabled="props.disabled || resolving"
						data-testid="agent-live-sources-link"
					/>
					<N8nButton
						type="submit"
						size="small"
						:loading="resolving"
						:disabled="!canAdd"
						data-testid="agent-live-sources-add"
					>
						{{ i18n.baseText('agents.builder.liveSources.form.add') }}
					</N8nButton>
				</div>
			</N8nInputLabel>
			<N8nText v-if="error" size="small" color="danger" data-testid="agent-live-sources-error">
				{{ error }}
			</N8nText>
		</form>

		<N8nText
			v-if="props.liveSources.length === 0"
			size="small"
			color="text-light"
			data-testid="agent-live-sources-empty"
		>
			{{ i18n.baseText('agents.builder.liveSources.empty') }}
		</N8nText>

		<ul v-else :class="$style.sources">
			<li
				v-for="source in props.liveSources"
				:key="source.id"
				:class="$style.source"
				data-testid="agent-live-source"
			>
				<div :class="$style.sourceHeader">
					<CredentialIcon
						:credential-type-name="credentialTypeOf(source)"
						:size="20"
						:class="$style.sourceIcon"
					/>
					<span
						:class="$style.sourceName"
						:title="source.name"
						data-testid="agent-live-source-name"
					>
						{{ source.name }}
					</span>
					<N8nText size="xsmall" color="text-light">{{ providerLabel(source.provider) }}</N8nText>
					<N8nSelect
						:model-value="source.retrieval ?? RETRIEVAL_DEFAULT"
						size="small"
						:disabled="props.disabled"
						:class="$style.retrievalSelect"
						:aria-label="i18n.baseText('agents.builder.liveSources.retrieval.label')"
						data-testid="agent-live-source-retrieval"
						@update:model-value="onRetrievalChange(source, $event)"
					>
						<N8nOption
							:value="RETRIEVAL_DEFAULT"
							:label="i18n.baseText('agents.builder.liveSources.retrieval.default')"
						/>
						<N8nOption
							v-for="strategy in LIVE_SOURCE_RETRIEVAL_STRATEGIES"
							:key="strategy"
							:value="strategy"
							:label="retrievalLabel(strategy)"
						/>
					</N8nSelect>
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						size="small"
						:disabled="props.disabled"
						:aria-label="i18n.baseText('agents.builder.liveSources.removeSource')"
						data-testid="agent-live-source-remove"
						@click="onRemoveSource(source)"
					/>
				</div>
				<ul :class="$style.items">
					<li
						v-for="item in source.items"
						:key="item.id"
						:class="$style.item"
						data-testid="agent-live-source-item"
					>
						<N8nIcon
							:icon="item.kind === 'container' ? 'folder' : 'file-text'"
							size="small"
							color="text-light"
							:class="$style.itemIcon"
						/>
						<N8nLink
							v-if="item.url"
							:to="item.url"
							new-window
							size="small"
							:class="$style.itemTitle"
							data-testid="agent-live-source-item-title"
						>
							{{ item.title }}
						</N8nLink>
						<span v-else :class="$style.itemTitle" data-testid="agent-live-source-item-title">
							{{ item.title }}
						</span>
						<N8nText v-if="item.containerType" size="xsmall" color="text-light">
							{{ item.containerType }}
						</N8nText>
						<N8nIconButton
							icon="x"
							variant="ghost"
							size="small"
							:disabled="props.disabled"
							:aria-label="i18n.baseText('agents.builder.liveSources.removeItem')"
							data-testid="agent-live-source-item-remove"
							@click="onRemoveItem(source, item)"
						/>
					</li>
				</ul>
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.formRow {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.providerField {
	flex: 0 1 140px;
	min-width: 120px;
}

.credentialField {
	flex: 1 1 200px;
	min-width: 0;
}

.linkRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	> :first-child {
		flex: 1 1 auto;
		min-width: 0;
	}
}

.sources {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	list-style: none;
	margin: 0;
	padding: 0;
}

.source {
	border: var(--border);
	border-radius: var(--radius);
}

.sourceHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.sourceIcon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.sourceName {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.retrievalSelect {
	flex: 0 0 auto;
	width: 160px;
}

.items {
	display: flex;
	flex-direction: column;
	list-style: none;
	margin: 0;
	padding: var(--spacing--4xs) 0;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--xs);

	&:hover {
		background-color: var(--background--hover);
	}
}

.itemIcon {
	flex-shrink: 0;
}

.itemTitle {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	font-size: var(--font-size--sm);
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
