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
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { AgentTeamsIntegrationSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { saveAs } from 'file-saver';
import { computed, onMounted, ref, watch } from 'vue';

import AgentChannelTeamsIdentityCard from './AgentChannelTeamsIdentityCard.vue';
import { fetchTeamsAppPackage } from './api';
import { TEAMS_PACKAGE_FILENAME } from './constants';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

const props = defineProps<{
	runtime: TeamsChannelRuntime;
	name: string;
	description: string;
	/** The channel's own credential — the one the Entra step wrote. */
	credentialId: string;
	projectId: string;
	agentId: string;
	/** What the channel runs on, which is what the published app must match. */
	settings?: AgentTeamsIntegrationSettings;
	/**
	 * Whether the form holds a manifest change that is not saved yet. Publishing
	 * from here sends the saved settings, so during that window the save is the
	 * only route that puts the right thing in the catalogue.
	 */
	unsavedChanges?: boolean;
}>();

type Busy = 'publish' | 'download';

const i18n = useI18n();
const rootStore = useRootStore();
const busy = ref<Busy | null>(null);
const errorMessage = ref('');
const downloaded = ref(false);
// The catalogue read runs on its own, so it takes no lock: an action the user
// chose must not wait on a background read, nor vanish when one fails.
const reading = ref(false);
const readFailed = ref(false);

const catalogState = computed(() => props.runtime.catalogState.value);
const published = computed(() => catalogState.value?.status === 'published');

/**
 * One sentence for where the app is, so the action below reads as the next
 * step. Nothing is claimed until the catalogue has answered: the read happens
 * on mount, and until it lands an app already published would otherwise be
 * announced as one nobody has published.
 */
const standing = computed(() => {
	if (!catalogState.value) {
		return readFailed.value
			? ('agents.channels.teams.managed.app.unknown' as const)
			: ('agents.channels.teams.managed.app.checking' as const);
	}
	if (reading.value) return 'agents.channels.teams.managed.app.checking' as const;
	if (published.value) return 'agents.channels.teams.managed.app.published' as const;
	if (catalogState.value?.status === 'submitted') {
		return 'agents.channels.teams.managed.app.submitted' as const;
	}
	if (catalogState.value?.status === 'rejected') {
		return 'agents.channels.teams.managed.app.rejected' as const;
	}
	return 'agents.channels.teams.managed.app.notPublished' as const;
});

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
	await run('publish', async () => await props.runtime.publishApp(props.settings));

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
		downloaded.value = true;
	});

/** Read once, when the settings open: the state is Microsoft's and it moves. */
async function readCatalogue() {
	reading.value = true;
	readFailed.value = false;
	try {
		await props.runtime.refreshCatalogState();
	} catch (error) {
		readFailed.value = true;
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
		<N8nText size="small" bold>
			{{ i18n.baseText('agents.channels.teams.settings.identityLabel') }}
		</N8nText>

		<AgentChannelTeamsIdentityCard :name="name" :description="description" ready>
			<template #action>
				<!--
					Offered once the app is published too: publishing again is how a
					changed manifest reaches the catalogue, and the notice beside this
					card says to do exactly that. Hidden only while a review is
					pending, which is the one state that cannot take another -- and
					shown while the catalogue is unread, because a read that never
					answers must not take the action away with it.
				-->
				<N8nButton
					v-if="catalogState?.status !== 'submitted'"
					variant="outline"
					size="medium"
					:loading="busy === 'publish'"
					:disabled="busy !== null || unsavedChanges"
					data-testid="teams-settings-publish"
					@click="publish"
				>
					{{ i18n.baseText('agents.channels.teams.managed.install.publish') }}
				</N8nButton>
				<!--
					Always offered. Uploading it is the only way to use the agent
					through the day Microsoft can take to make the published app
					addable.
				-->
				<N8nButton
					variant="ghost"
					size="medium"
					:loading="busy === 'download'"
					:disabled="busy !== null"
					data-testid="teams-settings-download"
					@click="downloadPackage"
				>
					{{ i18n.baseText('agents.channels.teams.setup.install.button') }}
					<N8nIcon icon="download" size="medium" />
				</N8nButton>
			</template>
		</AgentChannelTeamsIdentityCard>

		<N8nText size="small" color="text-light" data-testid="teams-managed-app-standing">
			{{ i18n.baseText(standing) }}
		</N8nText>

		<N8nText
			v-if="downloaded"
			size="small"
			color="text-light"
			data-testid="teams-managed-app-downloaded"
		>
			{{ i18n.baseText('agents.channels.teams.managed.install.downloaded') }}
		</N8nText>

		<N8nText v-if="errorMessage" size="small" color="danger" data-testid="teams-managed-app-error">
			{{ errorMessage }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
