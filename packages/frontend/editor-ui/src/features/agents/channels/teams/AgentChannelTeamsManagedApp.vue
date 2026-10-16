<script setup lang="ts">
/**
 * Where the app stands in the organisation, and the one thing to do about it,
 * for a channel that is already connected.
 *
 * Microsoft takes up to a day to make a published app installable, so a setup
 * that publishes and cannot add it yet is ordinary rather than failed. The
 * setup stepper is gone by then — it closes on connect — so without this the
 * only step left in the flow had nowhere to happen.
 */
import {
	N8nActionDropdown,
	N8nButton,
	N8nIcon,
	N8nLink,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import type { AgentTeamsIntegrationSettings, TeamsAgentSetupState } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { saveAs } from 'file-saver';
import { computed, onMounted, ref, watch } from 'vue';

import AgentChannelTeamsIdentityCard from './AgentChannelTeamsIdentityCard.vue';
import { fetchTeamsAppPackage } from './api';
import { AZURE_BOTS_URL, TEAMS_PACKAGE_FILENAME } from './constants';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

const props = defineProps<{
	runtime: TeamsChannelRuntime;
	name: string;
	description: string;
	/** The channel's own credential — the one the Entra step wrote. */
	credentialId: string;
	projectId: string;
	agentId: string;
	/** What the channel runs on. The package hands over this, not an open edit. */
	settings?: AgentTeamsIntegrationSettings;
	/**
	 * What the form holds. Publishing saves it first and sends this, captured
	 * before the save: `settings` catches up a round trip later, and an edit made
	 * while the save is away is not what was persisted.
	 */
	pendingSettings?: AgentTeamsIntegrationSettings;
	/**
	 * Whether the form holds a manifest change that is not saved yet. Publishing
	 * saves it first, so the catalogue never gets a version n8n does not hold.
	 */
	unsavedChanges?: boolean;
	/**
	 * Saves the channel without closing the modal. Publishing an unsaved change
	 * goes through this, so the user reaches the catalogue in one step and stays
	 * on the dialog that reports how it went.
	 */
	persistChannel?: () => Promise<boolean>;
	/** The bot the setup made. Null before n8n kept it, which falls back to the bot list. */
	azureBot?: TeamsAgentSetupState['azureBot'];
	/** Teams holds an older version than the agent and the form describe. */
	outdated?: boolean;
}>();

const emit = defineEmits<{
	/** n8n handed Teams a new version, so what it holds is worth reading again. */
	installed: [];
}>();

type Busy = 'publish' | 'download';

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const busy = ref<Busy | null>(null);
const errorMessage = ref('');
// The catalogue read runs on its own, so it takes no lock: an action the user
// chose must not wait on a background read, nor vanish when one fails.
const reading = ref(false);

const catalogState = computed(() => props.runtime.catalogState.value);

/** Only the states that wait on somebody else, since nothing else on the card says so. */
const standing = computed(() => {
	if (reading.value) return null;
	if (catalogState.value?.status === 'submitted') {
		return 'agents.channels.teams.managed.app.submitted' as const;
	}
	if (catalogState.value?.status === 'rejected') {
		return 'agents.channels.teams.managed.app.rejected' as const;
	}
	return null;
});

/**
 * The two routes are independent, so downloading the package must not take
 * publishing away. Only a pending review drops it: it is the one state that
 * cannot take another submission.
 */
const installMenuItems = computed(() => [
	{
		id: 'for-me',
		testId: 'teams-settings-download',
		label: i18n.baseText('agents.channels.teams.managed.install.forMe'),
		description: i18n.baseText('agents.channels.teams.managed.install.forMeHint'),
	},
	...(catalogState.value?.status === 'submitted'
		? []
		: [
				{
					id: 'publish',
					testId: 'teams-settings-publish',
					label: i18n.baseText('agents.channels.teams.managed.install.publish'),
					description: i18n.baseText('agents.channels.teams.managed.install.publishHintShort'),
				},
			]),
]);

async function run(name: Busy, action: () => Promise<void>) {
	if (busy.value) return;
	busy.value = name;
	errorMessage.value = '';
	try {
		await action();
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error);
	} finally {
		busy.value = null;
	}
}

const publish = async () =>
	await run('publish', async () => {
		// Captured before the save: read after it, an edit made while the save was
		// away would go to the catalogue without ever being persisted.
		const publishing = props.pendingSettings ?? props.settings;
		// Saved first, and abandoned if that fails: a publish that lands on top of
		// a failed save would leave the catalogue ahead of n8n, which is worse
		// than leaving it behind.
		if (props.unsavedChanges && !(await props.persistChannel?.())) return;
		// False when the sign-in or agent changed under it, so the catalogue was not read back.
		if (!(await props.runtime.publishApp(publishing))) return;
		const status = catalogState.value?.status;
		emit('installed');
		if (status === 'published') {
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('agents.channels.teams.managed.install.publishedToast'),
				message: i18n.baseText('agents.channels.teams.managed.install.publishedToastHint'),
			});
		} else if (status === 'submitted') {
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('agents.channels.teams.managed.install.submittedToast'),
				message: i18n.baseText('agents.channels.teams.managed.install.submitted'),
			});
		} else {
			// Microsoft took the upload but has not listed the app yet.
			toast.showMessage({
				type: 'info',
				title: i18n.baseText('agents.channels.teams.managed.install.unknown'),
			});
		}
	});

/**
 * Uploading the package needs no catalogue entry, so it is the only route that
 * works through the day Microsoft can take to make a published app addable.
 * Offered throughout rather than only once an add has been refused.
 */
const downloadPackage = async () =>
	await run('download', async () => {
		const blob = await fetchTeamsAppPackage(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			props.credentialId,
			props.settings,
		);
		saveAs(blob, TEAMS_PACKAGE_FILENAME);
		emit('installed');
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('agents.channels.teams.setup.install.downloaded'),
		});
	});

const onInstallMenu = async (id: string) =>
	id === 'publish' ? await publish() : await downloadPackage();

/** Read once, when the settings open: the state is Microsoft's and it moves. */
async function readCatalogue() {
	reading.value = true;
	try {
		await props.runtime.refreshCatalogState();
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error);
	} finally {
		reading.value = false;
	}
}

// The credential goes first: every call below acts on the app it stands for.
onMounted(() => {
	props.runtime.connectedCredentialId.value = props.credentialId;
	void readCatalogue();
});

watch(
	() => props.credentialId,
	(id) => (props.runtime.connectedCredentialId.value = id),
);
</script>

<template>
	<div :class="$style.field" data-testid="teams-managed-app">
		<N8nText step="sm" bold>
			{{ i18n.baseText('agents.channels.teams.settings.identityLabel') }}
		</N8nText>

		<AgentChannelTeamsIdentityCard
			:name="name"
			:description="description"
			ready
			:outdated="outdated"
		>
			<template #action>
				<N8nSpinner v-if="busy" size="medium" data-testid="teams-settings-install-spinner" />
				<N8nActionDropdown
					v-else
					:items="installMenuItems"
					placement="bottom-end"
					:teleported="false"
					@select="onInstallMenu"
				>
					<template #activator>
						<N8nButton variant="outline" size="medium" data-testid="teams-settings-install-menu">
							{{ i18n.baseText('agents.channels.teams.managed.install.menu') }}
							<N8nIcon icon="chevron-down" size="small" />
						</N8nButton>
					</template>
				</N8nActionDropdown>
			</template>
		</AgentChannelTeamsIdentityCard>

		<N8nText
			v-if="outdated"
			size="small"
			:class="$style.outdated"
			data-testid="teams-managed-app-outdated"
		>
			{{ i18n.baseText('agents.channels.teams.settings.outdated') }}
		</N8nText>

		<N8nText
			v-if="standing"
			size="small"
			color="text-light"
			data-testid="teams-managed-app-standing"
		>
			{{ i18n.baseText(standing) }}
		</N8nText>

		<N8nText v-if="errorMessage" size="small" color="danger" data-testid="teams-managed-app-error">
			{{ errorMessage }}
		</N8nText>

		<N8nText size="small" :class="$style.bot" data-testid="teams-managed-app-bot">
			<template v-if="azureBot">
				{{
					i18n.baseText('agents.channels.teams.settings.linkedBot', {
						interpolate: { name: azureBot.name },
					})
				}}{{ ' ' }}
			</template>
			<N8nLink
				:href="azureBot?.portalUrl ?? AZURE_BOTS_URL"
				target="_blank"
				rel="noopener noreferrer"
				size="small"
				data-testid="teams-managed-app-bot-link"
			>
				{{ i18n.baseText('agents.channels.teams.settings.findInAzure') }}
				<N8nIcon icon="arrow-up-right" size="xsmall" />
			</N8nLink>
		</N8nText>
	</div>
</template>

<style module lang="scss">
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.outdated {
	color: var(--text-color--warning);
}

.bot {
	margin-top: var(--spacing--xs);
}
</style>
