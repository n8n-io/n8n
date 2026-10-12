<script setup lang="ts">
/**
 * Where the Teams app may be used and how much it may read there.
 *
 * Shared by the setup stepper and the channel settings, because these are
 * manifest fields: changing one produces a new app package either way.
 */
import { computed, ref } from 'vue';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nIconButton,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSwitch2,
} from '@n8n/design-system';
import type { TeamsFileAccessCheck } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	ENTRA_APP_REGISTRATIONS_URL,
	entraApiPermissionsUrl,
	type TeamsAvailability,
} from './constants';

export type { TeamsAvailability } from './constants';

const value = defineModel<TeamsAvailability>({ required: true });

const props = withDefaults(
	defineProps<{
		startCollapsed?: boolean;
		/** Client ID of the app the channel runs on, once a credential is picked. */
		appId?: string | null;
		fileAccessConsentUrl?: string | null;
		/** Checked only where the channel is saved; unchecked shows the request. */
		fileAccessStatus?: TeamsFileAccessCheck['status'] | null;
	}>(),
	{ startCollapsed: false, appId: null, fileAccessConsentUrl: null, fileAccessStatus: null },
);

const i18n = useI18n();

// Local, because `startCollapsed` is only where the panel begins: bound
// straight to the row, the open state it emits has nothing to apply it.
const open = ref(!props.startCollapsed);

function set(patch: Partial<TeamsAvailability>) {
	const next = { ...value.value, ...patch };
	// A read permission without its surface is rejected by the backend schema, so
	// it cannot be left on when its scope goes off.
	if (!next.teamChannels) next.readAllChannelMessages = false;
	if (!next.groupChats) next.readAllGroupMessages = false;
	value.value = next;
}

interface Row {
	key: keyof TeamsAvailability;
	title: BaseTextKey;
	hint: BaseTextKey;
	testId: string;
}

const TEAM_CHANNELS: Row = {
	key: 'teamChannels',
	title: 'agents.channels.teams.setup.availability.teamChannels',
	hint: 'agents.channels.teams.setup.availability.teamChannelsHint',
	testId: 'teams-scope-channels',
};
const READ_CHANNELS: Row = {
	key: 'readAllChannelMessages',
	title: 'agents.channels.teams.setup.availability.readAllChannelMessages',
	hint: 'agents.channels.teams.setup.availability.readAllChannelMessagesHint',
	testId: 'teams-read-channels',
};
const GROUP_CHATS: Row = {
	key: 'groupChats',
	title: 'agents.channels.teams.setup.availability.groupChats',
	hint: 'agents.channels.teams.setup.availability.groupChatsHint',
	testId: 'teams-scope-groups',
};
const READ_GROUPS: Row = {
	key: 'readAllGroupMessages',
	title: 'agents.channels.teams.setup.availability.readAllGroupMessages',
	hint: 'agents.channels.teams.setup.availability.readAllGroupMessagesHint',
	testId: 'teams-read-groups',
};

// A read permission is offered only while its surface is on, since it depends on it.
const rows = computed(() => [
	TEAM_CHANNELS,
	...(value.value.teamChannels ? [READ_CHANNELS] : []),
	GROUP_CHATS,
	...(value.value.groupChats ? [READ_GROUPS] : []),
]);

/**
 * Files attached in a shared conversation live in SharePoint or OneDrive, which
 * only an app permission that an administrator grants can read.
 */
const fileAccess = computed(() => {
	if (!value.value.teamChannels && !value.value.groupChats) return null;
	if (props.fileAccessStatus === 'approved') return null;
	if (props.fileAccessConsentUrl) {
		return {
			text: 'agents.channels.teams.setup.availability.fileAccessConsent' as const,
			link: 'agents.channels.teams.setup.availability.fileAccessConsentLink' as const,
			url: props.fileAccessConsentUrl,
		};
	}
	return {
		text: 'agents.channels.teams.setup.availability.fileAccessPermission' as const,
		...(props.appId
			? {
					link: 'agents.channels.teams.setup.availability.fileAccessPermissionLink' as const,
					url: entraApiPermissionsUrl(props.appId),
				}
			: {
					link: 'agents.channels.teams.setup.availability.fileAccessRegistrationsLink' as const,
					url: ENTRA_APP_REGISTRATIONS_URL,
				}),
	};
});

const fileAccessApproved = computed(
	() =>
		(value.value.teamChannels || value.value.groupChats) && props.fileAccessStatus === 'approved',
);

const clipboard = useClipboard();
const toast = useToast();

/** A button, not a link: the callout paints every link inside it as text. */
function openFileAccess() {
	if (fileAccess.value) window.open(fileAccess.value.url, '_blank', 'noopener');
}

/** The person setting this up is often not the administrator who approves it. */
async function copyFileAccessLink() {
	if (!fileAccess.value) return;
	await clipboard.copy(fileAccess.value.url);
	toast.showMessage({ type: 'success', title: i18n.baseText('generic.copiedToClipboard') });
}

/** A collapsed panel still has to say what it is set to. */
const summary = computed(() => {
	const { teamChannels, readAllChannelMessages, groupChats, readAllGroupMessages } = value.value;
	const on = [
		teamChannels && 'agents.channels.teams.setup.availability.teamChannels',
		teamChannels &&
			readAllChannelMessages &&
			'agents.channels.teams.setup.availability.readsChannels',
		groupChats && 'agents.channels.teams.setup.availability.groupChats',
		groupChats &&
			readAllGroupMessages &&
			'agents.channels.teams.setup.availability.readsGroupChats',
	].filter((key): key is BaseTextKey => Boolean(key));
	if (on.length === 0) {
		return i18n.baseText('agents.channels.teams.setup.availability.directChatOnly');
	}
	return [
		i18n.baseText('agents.channels.teams.setup.availability.directChat'),
		...on.map((key) => i18n.baseText(key)),
	].join(i18n.baseText('agents.channels.teams.setup.availability.summarySeparator'));
});
</script>

<template>
	<div :class="$style.availability">
		<N8nSettingsRowGroup :class="$style.group">
			<N8nSettingsRow
				v-model="open"
				:title="i18n.baseText('agents.channels.teams.setup.availability.whereTitle')"
				:description="summary"
				expandable
				expand-label=""
				collapse-label=""
				:show-divider="false"
				data-testid="teams-availability"
			>
				<template #expanded>
					<N8nSettingsRow
						v-for="row in rows"
						:key="row.key"
						:title="i18n.baseText(row.title)"
						:description="i18n.baseText(row.hint)"
					>
						<template #action>
							<N8nSwitch2
								:model-value="value[row.key]"
								:aria-label="i18n.baseText(row.title)"
								:data-testid="row.testId"
								@update:model-value="set({ [row.key]: $event })"
							/>
						</template>
					</N8nSettingsRow>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
		<N8nCallout v-if="fileAccess" theme="info" data-testid="teams-file-access">
			{{ i18n.baseText(fileAccess.text) }}
			<template #trailingContent>
				<div :class="$style.fileAccessActions">
					<N8nButton
						variant="outline"
						size="small"
						data-testid="teams-file-access-link"
						@click="openFileAccess"
					>
						{{ i18n.baseText(fileAccess.link) }}
					</N8nButton>
					<N8nIconButton
						icon="copy"
						variant="ghost"
						size="small"
						:title="i18n.baseText('agents.channels.teams.setup.availability.fileAccessCopy')"
						:aria-label="i18n.baseText('agents.channels.teams.setup.availability.fileAccessCopy')"
						data-testid="teams-file-access-copy"
						@click="copyFileAccessLink"
					/>
				</div>
			</template>
		</N8nCallout>
		<N8nCallout v-if="fileAccessApproved" theme="success" data-testid="teams-file-access-approved">
			{{ i18n.baseText('agents.channels.teams.setup.availability.fileAccessApproved') }}
		</N8nCallout>
	</div>
</template>

<style module lang="scss">
.availability {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
}

.fileAccessActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/*
 * The group paints the page surface, which in dark mode is darker than the
 * modal it sits in. Letting the modal show through keeps it flat in both themes.
 * The doubled class outranks the group's own single-class rule.
 */
.group.group {
	background: transparent;
}
</style>
