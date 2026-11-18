<script lang="ts" setup>
import type { McpServerSummaryDto, PushMessage } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nSegmentControl,
	N8nText,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';

import McpServerCard from '../components/McpServerCard.vue';
import { MCP_SERVER_NEW_QUERY, MCP_SERVER_VIEW } from '../constants';
import { useMcpServersStore } from '../mcpServers.store';

type StatusFilter = 'all' | 'active' | 'inactive';

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const store = useMcpServersStore();
const pushConnectionStore = usePushConnectionStore();
const documentTitle = useDocumentTitle();

const loading = ref(!store.serversLoaded);
const creating = ref(false);
const search = ref('');
const status = ref<StatusFilter>('all');

const counts = computed(() => {
	const active = store.servers.filter((server) => server.active).length;
	return { all: store.servers.length, active, inactive: store.servers.length - active };
});

const statusOptions = computed(() => [
	{
		value: 'all' as const,
		label: i18n.baseText('mcpServers.list.filter.all', {
			interpolate: { count: counts.value.all },
		}),
	},
	{
		value: 'active' as const,
		label: i18n.baseText('mcpServers.list.filter.active', {
			interpolate: { count: counts.value.active },
		}),
	},
	{
		value: 'inactive' as const,
		label: i18n.baseText('mcpServers.list.filter.inactive', {
			interpolate: { count: counts.value.inactive },
		}),
	},
]);

const filteredServers = computed(() => {
	const query = search.value.trim().toLowerCase();
	return store.servers.filter((server) => {
		if (status.value === 'active' && !server.active) return false;
		if (status.value === 'inactive' && server.active) return false;
		if (!query) return true;
		return (
			server.name.toLowerCase().includes(query) ||
			server.description.toLowerCase().includes(query) ||
			server.slug.includes(query)
		);
	});
});

async function load() {
	try {
		await store.fetchServers();
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.list.loadError'));
	} finally {
		loading.value = false;
	}
}

async function onCreate() {
	if (creating.value) return;
	creating.value = true;
	try {
		const server = await store.createServer(i18n.baseText('mcpServers.list.defaultName'));
		await router.push({
			name: MCP_SERVER_VIEW,
			params: { serverId: server.id },
			query: { [MCP_SERVER_NEW_QUERY]: '1' },
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.list.createError'));
	} finally {
		creating.value = false;
	}
}

function onOpen(server: McpServerSummaryDto) {
	void router.push({ name: MCP_SERVER_VIEW, params: { serverId: server.id } });
}

function onPushMessage(event: PushMessage) {
	if (event.type === 'mcpServerUpdated' || event.type === 'mcpServerCallRecorded') {
		void store.fetchServers().catch(() => {});
	}
}

pushConnectionStore.pushConnect();
const removePushListener = pushConnectionStore.addEventListener(onPushMessage);

onMounted(() => {
	documentTitle.set(i18n.baseText('mcpServers.heading'));
	void load();
});

onBeforeUnmount(() => {
	removePushListener();
});
</script>

<template>
	<PageViewLayout>
		<template #header>
			<ProjectHeader />
		</template>
		<div :class="$style.content" data-testid="mcp-servers-list">
			<div :class="$style.toolbar">
				<N8nInput
					v-model="search"
					:class="$style.search"
					:placeholder="i18n.baseText('mcpServers.list.search')"
					size="medium"
					clearable
					data-testid="mcp-servers-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nSegmentControl
					v-model="status"
					:options="statusOptions"
					size="small"
					data-testid="mcp-servers-status-filter"
				/>
				<span :class="$style.spacer" />
				<N8nButton
					variant="brand"
					icon="plus"
					:loading="creating"
					data-testid="mcp-servers-create"
					data-attr="mcp-servers-create"
					@click="onCreate"
				>
					{{ i18n.baseText('mcpServers.list.create') }}
				</N8nButton>
			</div>

			<div v-if="loading" :class="$style.grid">
				<N8nLoading v-for="index in 3" :key="index" variant="rect" :class="$style.skeleton" />
			</div>

			<N8nEmptyState
				v-else-if="store.servers.length === 0"
				:icon="{ type: 'icon', value: 'mcp' }"
				:heading="i18n.baseText('mcpServers.list.empty.heading')"
				:description="i18n.baseText('mcpServers.list.empty.description')"
				:button-text="i18n.baseText('mcpServers.list.create')"
				button-variant="brand"
				data-testid="mcp-servers-empty"
				@click:button="onCreate"
			/>

			<N8nText v-else-if="filteredServers.length === 0" color="text-light" :class="$style.noMatch">
				{{ i18n.baseText('mcpServers.list.noMatch') }}
			</N8nText>

			<div v-else :class="$style.grid">
				<McpServerCard
					v-for="server in filteredServers"
					:key="server.id"
					:server="server"
					@open="onOpen"
				/>
			</div>

			<N8nCallout theme="secondary" icon="info" :class="$style.note">
				{{ i18n.baseText('mcpServers.list.instanceNote') }}
			</N8nCallout>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-block: var(--spacing--md) var(--spacing--2xl);
	align-content: start;
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.search {
	max-width: 280px;
}

.spacer {
	flex: 1;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: var(--spacing--sm);
}

.skeleton {
	height: var(--height--5xl);
}

.noMatch {
	padding-block: var(--spacing--lg);
	text-align: center;
}

.note {
	margin-top: var(--spacing--md);
}
</style>
