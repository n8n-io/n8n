<script setup lang="ts">
/**
 * Where the Teams app may be used and how much it may read there.
 *
 * Shared by the setup stepper and the channel settings, because these are
 * manifest fields: changing one produces a new app package either way.
 */
import { computed, ref } from 'vue';
import {
	N8nCallout,
	N8nLink,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSwitch2,
} from '@n8n/design-system';
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
		/** The Entra app n8n created, if any. Without it the user registered their own. */
		appId?: string;
	}>(),
	{ startCollapsed: false, appId: undefined },
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
	return props.appId
		? {
				text: 'agents.channels.teams.setup.availability.fileAccess' as const,
				link: 'agents.channels.teams.setup.availability.fileAccessLink' as const,
				url: entraApiPermissionsUrl(props.appId),
			}
		: {
				text: 'agents.channels.teams.setup.availability.fileAccessManual' as const,
				link: 'agents.channels.teams.setup.availability.fileAccessManualLink' as const,
				url: ENTRA_APP_REGISTRATIONS_URL,
			};
});

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
				<N8nLink :to="fileAccess.url" new-window size="small" data-testid="teams-file-access-link">
					{{ i18n.baseText(fileAccess.link) }}
				</N8nLink>
			</template>
		</N8nCallout>
	</div>
</template>

<style module lang="scss">
.availability {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
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
