<script setup lang="ts">
import type {
	McpServerConnectionsResponse,
	McpServerPerson,
	McpServerResponse,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nEmptyState,
	N8nLoading,
	N8nText,
	N8nTimeAgo,
	type TableHeader,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { blocksWithoutClient } from '../composables/useMcpServerConnections';
import { useMcpServerUrl } from '../composables/useMcpServerUrl';
import { blockMcpServerUser, removeMcpServerUser, restoreMcpServerUser } from '../mcp-servers.api';
import { getMcpServerPermissions } from '../mcp-servers.permissions';

// Block, Restore access, and Remove apply to the person: all of their clients at once.
const props = defineProps<{
	server: McpServerResponse;
	connections: McpServerConnectionsResponse | null;
	loading: boolean;
	/** The connections did not load. The tab offers a retry. */
	loadFailed?: boolean;
}>();

const emit = defineEmits<{ changed: [] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const { copyServerUrl } = useMcpServerUrl();

const permissions = computed(() => getMcpServerPermissions(props.server.projectId));

type ConnectionRow = McpServerPerson & {
	id: string;
	name: string;
	/** `null` for a blocked person with no client. */
	clientName: string | null;
	firstUsedAt: string | null;
	lastUsedAt: string | null;
	blocked: boolean;
};

function displayName(person: McpServerPerson) {
	const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
	return name || person.email || i18n.baseText('mcpServers.connections.unknownPerson');
}

const rows = computed<ConnectionRow[]>(() => {
	if (!props.connections) return [];
	const blocked = new Set(props.connections.blocks.map((block) => block.userId));
	const connectionRows = props.connections.connections.map((connection) => ({
		...connection,
		id: `${connection.userId}:${connection.oauthClientId}`,
		name: displayName(connection),
		blocked: blocked.has(connection.userId),
	}));
	const blockedOnlyRows = blocksWithoutClient(props.connections).map((block) => ({
		...block,
		id: block.userId,
		name: displayName(block),
		clientName: null,
		firstUsedAt: null,
		lastUsedAt: null,
		blocked: true,
	}));
	return [...connectionRows, ...blockedOnlyRows];
});

const headers = computed(() => {
	const columns: Array<TableHeader<ConnectionRow>> = [
		{
			title: i18n.baseText('mcpServers.connections.column.person'),
			key: 'name',
			disableSort: true,
		},
		{
			title: i18n.baseText('mcpServers.connections.column.client'),
			key: 'clientName',
			disableSort: true,
			width: 160,
		},
		{
			title: i18n.baseText('mcpServers.connections.column.firstUse'),
			key: 'firstUsedAt',
			disableSort: true,
			width: 140,
		},
		{
			title: i18n.baseText('mcpServers.connections.column.lastUse'),
			key: 'lastUsedAt',
			disableSort: true,
			width: 140,
		},
		{
			title: i18n.baseText('mcpServers.connections.column.access'),
			key: 'blocked',
			disableSort: true,
			width: 110,
		},
	];
	if (permissions.value.canUpdate) {
		columns.push({ title: '', key: 'id', disableSort: true, width: 240 });
	}
	return columns;
});

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });
const dateWithYearFormat = new Intl.DateTimeFormat(undefined, {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});

function formatDate(value: string) {
	const date = new Date(value);
	const format = date.getFullYear() === new Date().getFullYear() ? dateFormat : dateWithYearFormat;
	return format.format(date);
}

const busyUserId = ref<string | null>(null);

// The dialogs keep the name and the count while they close, so their text does not change on screen.
const blockDialog = ref({ open: false, userId: '', name: '' });
const removeDialog = ref({ open: false, userId: '', name: '', count: 0 });

function askBlock(row: ConnectionRow) {
	blockDialog.value = { open: true, userId: row.userId, name: row.name };
}

function askRemove(row: ConnectionRow) {
	const count = rows.value.filter((item) => item.userId === row.userId && item.clientName).length;
	removeDialog.value = { open: true, userId: row.userId, name: row.name, count };
}

async function runAction(
	userId: string,
	action: () => Promise<unknown>,
	success: string,
	error: string,
) {
	busyUserId.value = userId;
	try {
		await action();
		toast.showMessage({ type: 'success', title: success });
		emit('changed');
		return true;
	} catch (failure) {
		toast.showError(failure, error);
		return false;
	} finally {
		busyUserId.value = null;
	}
}

async function onBlock() {
	const { userId, name } = blockDialog.value;
	const done = await runAction(
		userId,
		async () =>
			await blockMcpServerUser(
				rootStore.restApiContext,
				props.server.projectId,
				props.server.id,
				userId,
			),
		i18n.baseText('mcpServers.connections.block.success', { interpolate: { name } }),
		i18n.baseText('mcpServers.connections.block.error', { interpolate: { name } }),
	);
	if (done) blockDialog.value.open = false;
}

async function onRestore(row: ConnectionRow) {
	const name = row.name;
	await runAction(
		row.userId,
		async () =>
			await restoreMcpServerUser(
				rootStore.restApiContext,
				props.server.projectId,
				props.server.id,
				row.userId,
			),
		i18n.baseText('mcpServers.connections.restore.success', { interpolate: { name } }),
		i18n.baseText('mcpServers.connections.restore.error', { interpolate: { name } }),
	);
}

async function onRemove() {
	const { userId, name } = removeDialog.value;
	const done = await runAction(
		userId,
		async () =>
			await removeMcpServerUser(
				rootStore.restApiContext,
				props.server.projectId,
				props.server.id,
				userId,
			),
		i18n.baseText('mcpServers.connections.remove.success', { interpolate: { name } }),
		i18n.baseText('mcpServers.connections.remove.error', { interpolate: { name } }),
	);
	if (done) removeDialog.value.open = false;
}

const removeDescription = computed(() => {
	const { name, count } = removeDialog.value;
	const key =
		props.server.project.type === 'personal'
			? 'mcpServers.connections.remove.description.personalProject'
			: 'mcpServers.connections.remove.description.teamProject';
	return i18n.baseText(key, {
		adjustToNumber: count,
		interpolate: { name, count: String(count), project: props.server.project.name },
	});
});
</script>

<template>
	<div :class="$style.tab" data-test-id="mcp-server-connections">
		<N8nLoading v-if="!connections && loading" :rows="3" />
		<N8nEmptyState
			v-else-if="!connections && loadFailed"
			:icon="{ type: 'icon', value: 'triangle-alert' }"
			:heading="i18n.baseText('mcpServers.connections.load.error')"
			:button-text="i18n.baseText('mcpServers.connections.load.retry')"
			data-test-id="mcp-server-connections-load-error"
			@click:button="emit('changed')"
		/>
		<N8nEmptyState
			v-else-if="connections && rows.length === 0"
			:icon="{ type: 'icon', value: 'plug' }"
			:heading="i18n.baseText('mcpServers.connections.empty.heading')"
			:description="i18n.baseText('mcpServers.connections.empty.description')"
			data-test-id="mcp-server-connections-empty"
		>
			<template #additionalContent>
				<N8nButton
					variant="solid"
					icon="copy"
					:label="i18n.baseText('mcpServers.actions.copyUrl')"
					data-test-id="mcp-server-connections-copy-url"
					@click="copyServerUrl(server)"
				/>
			</template>
		</N8nEmptyState>
		<N8nDataTableServer
			v-else-if="connections"
			:headers="headers"
			:items="rows"
			:items-length="rows.length"
			:pagination="false"
			data-test-id="mcp-server-connections-table"
		>
			<template #[`item.name`]="{ item }">
				<div :class="$style.person" data-test-id="mcp-server-connection-person">
					<N8nAvatar
						:first-name="item.firstName ?? undefined"
						:last-name="item.lastName ?? undefined"
						size="small"
					/>
					<div :class="$style.personText">
						<N8nText bold size="small">{{ item.name }}</N8nText>
						<N8nText v-if="item.email && item.email !== item.name" size="small" color="text-light">
							{{ item.email }}
						</N8nText>
					</div>
				</div>
			</template>
			<template #[`item.clientName`]="{ item }">
				<N8nText size="small" data-test-id="mcp-server-connection-client">
					{{ item.clientName ?? '–' }}
				</N8nText>
			</template>
			<template #[`item.firstUsedAt`]="{ item }">
				<N8nText size="small">{{ item.firstUsedAt ? formatDate(item.firstUsedAt) : '–' }}</N8nText>
			</template>
			<template #[`item.lastUsedAt`]="{ item }">
				<N8nText size="small">
					<N8nTimeAgo v-if="item.lastUsedAt" :date="item.lastUsedAt" capitalize />
					<template v-else>–</template>
				</N8nText>
			</template>
			<template #[`item.blocked`]="{ item }">
				<N8nBadge
					:variant="item.blocked ? 'danger' : 'success'"
					size="small"
					data-test-id="mcp-server-connection-access"
				>
					{{
						item.blocked
							? i18n.baseText('mcpServers.connections.access.blocked')
							: i18n.baseText('mcpServers.connections.access.active')
					}}
				</N8nBadge>
			</template>
			<template #[`item.id`]="{ item }">
				<div v-if="item.blocked" :class="$style.rowActions">
					<N8nButton
						variant="outline"
						size="small"
						:label="i18n.baseText('mcpServers.connections.restore')"
						:disabled="busyUserId === item.userId"
						data-test-id="mcp-server-connection-restore"
						@click="onRestore(item)"
					/>
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('mcpServers.connections.remove')"
						:disabled="busyUserId === item.userId"
						data-test-id="mcp-server-connection-remove"
						@click="askRemove(item)"
					/>
				</div>
				<N8nButton
					v-else
					variant="ghost"
					size="small"
					:label="i18n.baseText('mcpServers.connections.block')"
					:disabled="busyUserId === item.userId"
					data-test-id="mcp-server-connection-block"
					@click="askBlock(item)"
				/>
			</template>
		</N8nDataTableServer>

		<N8nAlertDialog
			:open="blockDialog.open"
			:title="
				i18n.baseText('mcpServers.connections.block.title', {
					interpolate: { name: blockDialog.name },
				})
			"
			:description="
				i18n.baseText('mcpServers.connections.block.description', {
					interpolate: { name: blockDialog.name, server: server.name },
				})
			"
			:action-label="i18n.baseText('mcpServers.connections.block')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="busyUserId === blockDialog.userId"
			data-test-id="mcp-server-block-dialog"
			@update:open="blockDialog.open = $event"
			@action="onBlock"
			@cancel="blockDialog.open = false"
		/>
		<N8nAlertDialog
			:open="removeDialog.open"
			:title="
				i18n.baseText('mcpServers.connections.remove.title', {
					interpolate: { name: removeDialog.name },
				})
			"
			:description="removeDescription"
			:action-label="i18n.baseText('mcpServers.connections.remove')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="busyUserId === removeDialog.userId"
			data-test-id="mcp-server-remove-dialog"
			@update:open="removeDialog.open = $event"
			@action="onRemove"
			@cancel="removeDialog.open = false"
		/>
	</div>
</template>

<style lang="scss" module>
.tab {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-top: var(--spacing--xs);
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0;
}

.personText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

// Block-level like the single "Block" button, so both start at the same place in the cell.
.rowActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
