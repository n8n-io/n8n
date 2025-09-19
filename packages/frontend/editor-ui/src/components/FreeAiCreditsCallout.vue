<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { computed, ref } from 'vue';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { N8nCallout, N8nText } from '@n8n/design-system';

type Props = {
	credentialTypeName?: string;
};

const props = defineProps<Props>();

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
const credentialsStore = useCredentialsStore();
const usersStore = useUsersStore();
const ndvStore = useNDVStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();

const i18n = useI18n();
const toast = useToast();

const userHasOpenAiCredentialAlready = computed(
	() =>
		!!credentialsStore.allCredentials.filter(
			(credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE,
		).length,
);

const isEditingOpenAiCredential = computed(
	() => props.credentialTypeName && props.credentialTypeName === OPEN_AI_API_CREDENTIAL_TYPE,
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
		(activeNodeHasOpenAiApiCredential.value || isEditingOpenAiCredential.value) &&
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

		telemetry.track('User claimed OpenAI credits');

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
	<N8nCallout
		v-if="userCanClaimOpenAiCredits && !showSuccessCallout"
		theme="secondary"
		icon="circle-alert"
		class="mt-xs"
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
	</N8nCallout>
	<N8nCallout v-else-if="showSuccessCallout" theme="success" icon="circle-check" class="mt-xs">
		<N8nText size="small">
			{{
				i18n.baseText('freeAi.credits.callout.success.title.part1', {
					interpolate: { credits: settingsStore.aiCreditsQuota },
				})
			}}
		</N8nText>
		&nbsp;
		<N8nText size="small" :bold="true">
			{{ i18n.baseText('freeAi.credits.callout.success.title.part2') }}
		</N8nText>
	</N8nCallout>
	<div v-else />
</template>
