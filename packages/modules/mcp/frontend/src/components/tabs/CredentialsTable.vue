<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import type { McpCredential } from '../../mcp.types';
import type { TableHeader, TableOptions, UserAction } from '@n8n/design-system';
import {
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nSelectedItemsInfo,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useRouter } from 'vue-router';

type Props = {
	/** The rows of the current page. */
	credentials: McpCredential[];
	totalCount: number;
	loading: boolean;
	/** Whether the user has credentials that can still be enabled. */
	canConnect: boolean;
};

const props = defineProps<Props>();

const tableOptions = defineModel<TableOptions>('tableOptions', {
	default: () => ({
		page: 0,
		itemsPerPage: 10,
		sortBy: [],
	}),
});

const tablePage = computed({
	get: () => tableOptions.value.page,
	set: (page: number) => {
		tableOptions.value = { ...tableOptions.value, page };
	},
});

const tableItemsPerPage = computed({
	get: () => tableOptions.value.itemsPerPage,
	set: (itemsPerPage: number) => {
		tableOptions.value = { ...tableOptions.value, itemsPerPage };
	},
});

const tableSortBy = computed({
	get: () => tableOptions.value.sortBy,
	set: (sortBy: TableOptions['sortBy']) => {
		tableOptions.value = { ...tableOptions.value, sortBy };
	},
});

const emit = defineEmits<{
	removeMcpAccess: [credential: McpCredential];
	bulkRemoveMcpAccess: [credentialIds: string[]];
	connectCredentials: [];
	'update:options': [payload: TableOptions];
}>();

const i18n = useI18n();
const router = useRouter();

const CredentialIcon = computed(() => componentRegistry.get('credential-icon'));
const credentialTypeNames = capabilityRegistry.tryUse(capabilities.credentialTypeNames);

const selectedCredentialIds = ref<string[]>([]);

// Selection references loaded rows, so any data reload invalidates it
watch(
	() => props.credentials,
	() => {
		selectedCredentialIds.value = [];
	},
);

const clearSelection = () => {
	selectedCredentialIds.value = [];
};

const onBulkRemoveMcpAccess = () => {
	emit('bulkRemoveMcpAccess', selectedCredentialIds.value);
};

const tableHeaders = ref<Array<TableHeader<McpCredential>>>([
	{
		title: i18n.baseText('settings.mcp.credentials.table.column.name'),
		key: 'credential',
		width: 260,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.credentials.table.column.type'),
		key: 'type',
		width: 200,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.credentials.table.column.usedFor'),
		key: 'usedFor',
		width: 160,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.credentials.table.column.project'),
		key: 'project',
		width: 180,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 50,
		disableSort: true,
		value() {
			return;
		},
	},
]);

const actionsFor = (credential: McpCredential): Array<UserAction<McpCredential>> => [
	{
		label: i18n.baseText('settings.mcp.credentials.table.action.removeMCPAccess'),
		value: 'removeFromMCP',
		disabled: !credential.canUpdate,
		tooltip: credential.canUpdate
			? undefined
			: i18n.baseText('settings.mcp.credentials.table.action.removeMCPAccess.noPermission'),
	},
];

const onCredentialAction = (action: string, credential: McpCredential) => {
	if (action === 'removeFromMCP') {
		emit('removeMcpAccess', credential);
	}
};

const onConnectClick = () => {
	emit('connectCredentials');
};

const typeName = (credential: McpCredential) =>
	credentialTypeNames?.displayNameOf(credential.type) ?? credential.type;

const usedFor = (credential: McpCredential) => {
	const parts: string[] = [];
	if (credential.nodeCount > 0) {
		parts.push(
			i18n.baseText('settings.mcp.credentials.table.usedFor.nodes', {
				adjustToNumber: credential.nodeCount,
				interpolate: { count: String(credential.nodeCount) },
			}),
		);
	}
	if (credential.mcpServerCount > 0) {
		parts.push(i18n.baseText('settings.mcp.credentials.table.usedFor.mcpServer'));
	}
	return parts.join(', ');
};

const projectName = (credential: McpCredential) =>
	credential.homeProject?.type === 'personal'
		? i18n.baseText('projects.menu.personal')
		: (credential.homeProject?.name ?? '');

const credentialLink = (credential: McpCredential) =>
	credential.homeProject
		? router.resolve({
				name: VIEWS.PROJECTS_CREDENTIALS,
				params: { projectId: credential.homeProject.id, credentialId: credential.id },
			}).fullPath
		: undefined;

const projectLink = (credential: McpCredential) =>
	credential.homeProject
		? router.resolve({
				name: VIEWS.PROJECTS_CREDENTIALS,
				params: { projectId: credential.homeProject.id },
			}).fullPath
		: undefined;
</script>

<template>
	<div>
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl" :class="$style['table-container']">
			<N8nDataTableServer
				v-model:sort-by="tableSortBy"
				v-model:page="tablePage"
				v-model:items-per-page="tableItemsPerPage"
				v-model:selection="selectedCredentialIds"
				:class="$style['credential-table']"
				data-test-id="mcp-credential-table"
				:headers="tableHeaders"
				:items="props.credentials"
				:items-length="props.totalCount"
				:page-sizes="[10, 25, 50]"
				:show-select="props.totalCount > 0"
				:item-selectable="(credential: McpCredential) => credential.canUpdate"
				@update:options="emit('update:options', $event)"
			>
				<template v-if="props.totalCount === 0" #cover>
					<div :class="$style['empty-state']">
						<N8nText data-test-id="mcp-credential-table-empty-state" size="large" color="text-base">
							{{ i18n.baseText('settings.mcp.credentials.table.empty.title') }}
						</N8nText>
						<N8nText
							data-test-id="mcp-credential-table-empty-state-description"
							size="small"
							color="text-base"
						>
							{{
								props.canConnect
									? i18n.baseText('settings.mcp.credentials.table.empty.description')
									: i18n.baseText('settings.mcp.credentials.table.empty.noneAvailable')
							}}
						</N8nText>
						<N8nButton
							v-if="props.canConnect"
							variant="solid"
							data-test-id="mcp-credential-table-empty-state-button"
							:label="i18n.baseText('settings.mcp.connectCredentials')"
							@click="onConnectClick"
						/>
					</div>
				</template>
				<template #[`item.credential`]="{ item }">
					<div :class="$style.cell" data-test-id="mcp-credential-cell">
						<span :class="$style.icon">
							<component
								:is="CredentialIcon"
								v-if="CredentialIcon"
								:credential-type-name="item.type"
								:size="16"
							/>
							<N8nIcon v-else icon="key-round" size="medium" />
						</span>
						<N8nLink
							v-if="credentialLink(item)"
							data-test-id="mcp-credential-name-link"
							:new-window="true"
							:to="credentialLink(item)"
							:theme="'text'"
							:class="[$style['table-link'], $style.truncate]"
						>
							<N8nText :class="$style.truncate" data-test-id="mcp-credential-name">{{
								item.name
							}}</N8nText>
						</N8nLink>
						<N8nText v-else :class="$style.truncate" data-test-id="mcp-credential-name">{{
							item.name
						}}</N8nText>
					</div>
				</template>
				<template #[`item.type`]="{ item }">
					<div :class="$style.cell">
						<N8nText :class="$style.truncate" data-test-id="mcp-credential-type">{{
							typeName(item)
						}}</N8nText>
					</div>
				</template>
				<template #[`item.usedFor`]="{ item }">
					<div :class="$style.cell">
						<N8nText :class="$style.truncate" data-test-id="mcp-credential-used-for">{{
							usedFor(item)
						}}</N8nText>
					</div>
				</template>
				<template #[`item.project`]="{ item }">
					<div :class="$style.cell" data-test-id="mcp-credential-project-cell">
						<N8nLink
							v-if="projectLink(item)"
							data-test-id="mcp-credential-project-link"
							:new-window="true"
							:to="projectLink(item)"
							:theme="'text'"
							:class="[$style['table-link'], $style.truncate]"
						>
							<N8nText :class="$style.truncate" data-test-id="mcp-credential-project-name">{{
								projectName(item)
							}}</N8nText>
						</N8nLink>
					</div>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						data-test-id="mcp-credential-action-toggle"
						placement="bottom"
						:actions="actionsFor(item)"
						theme="dark"
						@action="onCredentialAction($event, item)"
					/>
				</template>
			</N8nDataTableServer>
			<N8nSelectedItemsInfo
				:class="$style['selection-bar']"
				:selected-count="selectedCredentialIds.length"
				@clear-selection="clearSelection"
			>
				<template #actions>
					<N8nButton
						variant="outline"
						data-test-id="mcp-bulk-remove-credential-access-button"
						:label="i18n.baseText('settings.mcp.credentials.table.action.removeMCPAccess')"
						@click="onBulkRemoveMcpAccess"
					/>
				</template>
			</N8nSelectedItemsInfo>
		</div>
	</div>
</template>

<style module lang="scss">
// The selection bar's default absolute positioning assumes a tall anchor
// container and overlaps the header when the table is short. Sticky keeps
// it below the table, floating at the viewport bottom only while a long
// table extends past it.
.table-container .selection-bar {
	position: sticky;
	bottom: var(--spacing--3xl);
	left: auto;
	transform: none;
	width: fit-content;
	margin: 0 auto;
}

.credential-table {
	margin-bottom: var(--spacing--sm);

	:global(.table-scroll) {
		overflow-y: hidden;
	}

	tr:last-child {
		border-bottom: none !important;
	}
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg) 0;
	min-height: 250px;
}

.cell {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
	min-width: 0;
	overflow: hidden;
}

.icon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	color: var(--color--text--tint-1);
}

.table-link {
	color: var(--color--text);
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
