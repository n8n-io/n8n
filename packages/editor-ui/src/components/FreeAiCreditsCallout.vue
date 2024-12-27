<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { AI_CREDITS_EXPERIMENT } from '@/constants';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { usePostHog } from '@/stores/posthog.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { computed, ref } from 'vue';

const OPEN_AI_API_CREDENTIAL_TYPE = 'openAiApi';

const LANGCHAIN_NODES_PREFIX = '@n8n/n8n-nodes-langchain.';

const N8N_NODES_PREFIX = '@n8n/n8n-nodes.';

const NODES_WITH_OPEN_AI_API_CREDENTIAL = [
	`${LANGCHAIN_NODES_PREFIX}openAi`,
	`${LANGCHAIN_NODES_PREFIX}embeddingsOpenAi`,
	`${LANGCHAIN_NODES_PREFIX}lmChatOpenAi`,
	`${N8N_NODES_PREFIX}openAi`,
];

const showSuccessCallout = ref(false);
const claimingCredits = ref(false);

const settingsStore = useSettingsStore();
const postHogStore = usePostHog();
const credentialsStore = useCredentialsStore();
const usersStore = useUsersStore();
const ndvStore = useNDVStore();
const projectsStore = useProjectsStore();

const i18n = useI18n();
const toast = useToast();

const userHasOpenAiCredentialAlready = computed(
	() =>
		!!credentialsStore.allCredentials.filter(
			(credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE,
		).length,
);

const userHasClaimedAiCreditsAlready = computed(
	() => !!usersStore.currentUser?.settings?.userClaimedAiCredits,
);

const activeNodeHasOpenAiApiCredential = computed(
	() =>
		ndvStore.activeNode?.type &&
		NODES_WITH_OPEN_AI_API_CREDENTIAL.includes(ndvStore.activeNode.type),
);

const userCanClaimOpenAiCredits = computed(() => {
	return (
		settingsStore.isAiCreditsEnabled &&
		activeNodeHasOpenAiApiCredential.value &&
		postHogStore.isFeatureEnabled(AI_CREDITS_EXPERIMENT.name) &&
		!userHasOpenAiCredentialAlready.value &&
		!userHasClaimedAiCreditsAlready.value
	);
});

const onClaimCreditsClicked = async () => {
	claimingCredits.value = true;

	try {
		await credentialsStore.claimFreeAiCredits(projectsStore.currentProject?.id);

		if (usersStore?.currentUser?.settings) {
			usersStore.currentUser.settings.userClaimedAiCredits = true;
		}

		showSuccessCallout.value = true;
	} catch (e) {
		toast.showError(
			e,
			i18n.baseText('freeAi.credits.showError.claim.title'),
			i18n.baseText('freeAi.credits.showError.claim.message'),
		);
	} finally {
		claimingCredits.value = false;
	}
};
</script>
<template>
	<div class="mt-xs">
		<n8n-callout
			v-if="userCanClaimOpenAiCredits && !showSuccessCallout"
			theme="secondary"
			icon="exclamation-circle"
		>
			{{
				i18n.baseText('freeAi.credits.callout.claim.title', {
					interpolate: { credits: settingsStore.aiCreditsQuota },
				})
			}}
			<template #trailingContent>
				<n8n-button
					type="tertiary"
					size="small"
					:label="i18n.baseText('freeAi.credits.callout.claim.button.label')"
					:loading="claimingCredits"
					@click="onClaimCreditsClicked"
				/>
			</template>
		</n8n-callout>
		<n8n-callout v-else-if="showSuccessCallout" theme="success" icon="check-circle">
			{{
				i18n.baseText('freeAi.credits.callout.success.title', {
					interpolate: { credits: settingsStore.aiCreditsQuota },
				})
			}}
		</n8n-callout>
	</div>
</template>
