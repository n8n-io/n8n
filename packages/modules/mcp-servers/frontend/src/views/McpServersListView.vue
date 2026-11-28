<script setup lang="ts">
import type { McpServerResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nEmptyState, N8nIcon, N8nInput, N8nLink, N8nText } from '@n8n/design-system';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BuiltInMcpCard from '../components/BuiltInMcpCard.vue';
import CreateMcpServerDialog from '../components/CreateMcpServerDialog.vue';
import McpServerCard from '../components/McpServerCard.vue';
import { useCreateMcpServerDialog } from '../composables/useCreateMcpServerDialog';
import { useMcpServerUrl } from '../composables/useMcpServerUrl';
import { listMcpServers } from '../mcp-servers.api';
import { MCP_SERVER_VIEW, MCP_SETTINGS_ROUTE } from '../mcp-servers.constants';
import { getMcpServerPermissions } from '../mcp-servers.permissions';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const toast = useToast();
const latestFetch = useLatestFetch();
const createDialog = useCreateMcpServerDialog();
const { copyServerUrl, copyShareLink } = useMcpServerUrl();
const projectPermissions = capabilityRegistry.use(capabilities.projectPermissions);

const ResourcesListLayout = computed(() => componentRegistry.get('resources-list-layout'));
const ProjectHeader = computed(() => componentRegistry.get('project-header'));

const servers = ref<McpServerResponse[]>([]);
const loading = ref(true);
const search = ref('');
const searchTerm = computed(() => search.value.trim().toLowerCase());
/** The project of the shown list. `null` before the first load. On Overview it is `undefined`. */
let listedProjectId: string | undefined | null = null;

const projectId = computed(() =>
	typeof route.params.projectId === 'string' ? route.params.projectId : undefined,
);

/** On Overview, the dialog lets the builder pick a project, so a create right in any project is enough. */
const canCreate = computed(() => {
	const id = projectId.value ?? projectPermissions.defaultProjectId?.();
	return id !== undefined && getMcpServerPermissions(id).canCreate;
});

const filteredServers = computed(() => {
	const term = searchTerm.value;
	return term
		? servers.value.filter((server) => server.name.toLowerCase().includes(term))
		: servers.value;
});

const emptyStateIcon = {
	type: 'cards' as const,
	center: 'mcp',
	sides: ['workflow', 'plug'],
	animated: false,
};

// The layout calls this on mount and when the project of the route changes.
async function initialize() {
	const isLatest = latestFetch.next();
	// Another project: the cards and the search of the old one go, also when the load fails.
	if (projectId.value !== listedProjectId) {
		listedProjectId = projectId.value;
		servers.value = [];
		search.value = '';
	}
	loading.value = servers.value.length === 0;
	try {
		const result = await listMcpServers(rootStore.restApiContext, projectId.value);
		if (!isLatest()) return;
		servers.value = result;
	} catch (error) {
		if (!isLatest()) return;
		toast.showError(error, i18n.baseText('mcpServers.list.error'));
	}
	loading.value = false;
}

function serverRoute(server: McpServerResponse) {
	return { name: MCP_SERVER_VIEW, params: { projectId: server.projectId, serverId: server.id } };
}

function openServer(server: McpServerResponse) {
	void router.push(serverRoute(server));
}
</script>

<template>
	<component
		:is="ResourcesListLayout"
		v-if="ResourcesListLayout"
		resource-key="mcpServers"
		tab-key="mcpServers"
		type="list-full"
		:resources="[]"
		:initialize="initialize"
		:loading="loading"
		:disabled="false"
		:has-empty-state="servers.length === 0"
		:shareable="false"
		:ui-config="{ searchEnabled: false, showFiltersDropdown: false, sortEnabled: false }"
	>
		<template #header>
			<component :is="ProjectHeader" v-if="ProjectHeader" main-button="mcpServer" />
			<!-- In a portal. The header slot shows in every state, so the dialog lives here. -->
			<CreateMcpServerDialog />
		</template>
		<template #empty>
			<N8nEmptyState
				:icon="emptyStateIcon"
				:heading="i18n.baseText('mcpServers.empty.heading')"
				:description="i18n.baseText('mcpServers.empty.description')"
				data-test-id="mcp-servers-empty-state"
			>
				<template v-if="canCreate" #additionalContent>
					<N8nButton
						variant="solid"
						size="large"
						:label="i18n.baseText('mcpServers.create.button')"
						data-test-id="mcp-servers-empty-create"
						@click="createDialog.open(projectId)"
					/>
				</template>
			</N8nEmptyState>
			<N8nText size="small" color="text-light" align="center" tag="p" :class="$style.builtInHint">
				{{ i18n.baseText('mcpServers.empty.builtInHint') }}
				<N8nLink
					:to="{ name: MCP_SETTINGS_ROUTE }"
					size="small"
					theme="text"
					bold
					data-test-id="mcp-servers-builtin-link"
				>
					{{ i18n.baseText('mcpServers.empty.builtInLink') }}
				</N8nLink>
			</N8nText>
		</template>
		<template #preamble>
			<div :class="$style.page">
				<N8nInput
					v-model="search"
					:class="$style.search"
					:placeholder="i18n.baseText('mcpServers.list.search')"
					size="medium"
					clearable
					data-test-id="mcp-servers-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<div :class="$style.grid" data-test-id="mcp-servers-grid">
					<BuiltInMcpCard v-if="!searchTerm" />
					<McpServerCard
						v-for="server in filteredServers"
						:key="server.id"
						:server="server"
						:to="serverRoute(server)"
						@open="openServer(server)"
						@copy-share-link="copyShareLink(server)"
						@copy-url="copyServerUrl(server)"
					/>
				</div>
				<N8nText
					v-if="filteredServers.length === 0"
					color="text-light"
					data-test-id="mcp-servers-no-results"
				>
					{{ i18n.baseText('mcpServers.list.noResults') }}
				</N8nText>
			</div>
		</template>
	</component>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.search {
	max-width: calc(var(--spacing--5xl) + var(--spacing--xl));

	@include breakpoints.breakpoint('sm-and-down') {
		max-width: 100%;
	}
}

.grid {
	display: grid;
	grid-template-columns: repeat(
		auto-fill,
		minmax(calc(var(--spacing--5xl) + var(--spacing--2xl)), 1fr)
	);
	gap: var(--spacing--sm);
}

.builtInHint {
	margin: var(--spacing--sm) 0 0;
}
</style>
