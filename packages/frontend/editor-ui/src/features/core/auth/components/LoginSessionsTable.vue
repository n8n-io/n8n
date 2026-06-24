<script lang="ts" setup>
import type { LoginSession } from '@n8n/api-types';
import { N8nActionDropdown, N8nBadge, N8nDataTableServer, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import { DateTime } from 'luxon';
import { computed, ref } from 'vue';

import { parseUserAgent } from '../utils/parseUserAgent';

const props = defineProps<{
	sessions: LoginSession[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	revoke: [session: LoginSession];
}>();

const i18n = useI18n();

function formatDevice(session: LoginSession): string {
	const { browser, os } = parseUserAgent(session.userAgent);
	if (browser && os) return `${browser} · ${os}`;
	return browser ?? os ?? i18n.baseText('settings.personal.loginSessions.device.unknown');
}

function formatRelative(iso: string | null): string {
	if (!iso) return i18n.baseText('settings.personal.loginSessions.never');
	return DateTime.fromISO(iso).toRelative() ?? '';
}

function formatDate(iso: string): string {
	return DateTime.fromISO(iso).toFormat('d LLL yyyy');
}

function getRowActions(): Array<ActionDropdownItem<'revoke'>> {
	return [
		{
			id: 'revoke',
			label: i18n.baseText('settings.personal.loginSessions.actions.revoke'),
			icon: 'trash-2',
			testId: 'login-session-revoke-action',
		},
	];
}

const rows = computed(() => props.sessions);

const headers = ref<Array<TableHeader<LoginSession>>>([
	{
		title: i18n.baseText('settings.personal.loginSessions.columns.device'),
		key: 'userAgent',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.personal.loginSessions.columns.ipAddress'),
		key: 'ipAddress',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.personal.loginSessions.columns.lastActive'),
		key: 'lastActiveAt',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.personal.loginSessions.columns.created'),
		key: 'createdAt',
		disableSort: true,
		resize: false,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 80,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
]);
</script>

<template>
	<div data-test-id="login-sessions-table">
		<N8nDataTableServer
			:headers="headers"
			:items="rows"
			:items-length="rows.length"
			:loading="loading"
			:page-sizes="[10, 25, 50]"
		>
			<template #[`item.userAgent`]="{ item }">
				<div :class="$style.device">
					<N8nText>{{ formatDevice(item) }}</N8nText>
					<N8nBadge v-if="item.current" theme="success" data-test-id="login-session-current-badge">
						{{ i18n.baseText('settings.personal.loginSessions.current') }}
					</N8nBadge>
				</div>
			</template>
			<template #[`item.ipAddress`]="{ item }">
				<N8nText :color="item.ipAddress ? undefined : 'text-light'">
					{{ item.ipAddress ?? i18n.baseText('settings.personal.loginSessions.unknown') }}
				</N8nText>
			</template>
			<template #[`item.lastActiveAt`]="{ item }">
				<N8nText :color="item.lastActiveAt ? undefined : 'text-light'">
					{{ formatRelative(item.lastActiveAt) }}
				</N8nText>
			</template>
			<template #[`item.createdAt`]="{ item }">
				<N8nText>{{ formatDate(item.createdAt) }}</N8nText>
			</template>
			<template #[`item.actions`]="{ item }">
				<div :class="$style.rowActions" @click.stop>
					<N8nActionDropdown
						v-if="!item.current"
						:items="getRowActions()"
						placement="bottom-end"
						activator-size="small"
						data-test-id="login-session-actions-toggle"
						@select="() => emit('revoke', item)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.device {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.rowActions {
	display: flex;
	justify-content: flex-end;
}
</style>
