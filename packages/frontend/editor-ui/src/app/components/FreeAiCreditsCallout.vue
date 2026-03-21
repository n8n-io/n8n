<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useFreeAiCredits } from '@/app/composables/useFreeAiCredits';
import { computed, ref } from 'vue';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';

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

const ndvStore = useNDVStore();
const i18n = useI18n();

const { aiCreditsQuota, userCanClaimOpenAiCredits, claimingCredits, claimCredits } =
	useFreeAiCredits();

const isEditingOpenAiCredential = computed(
	() => props.credentialTypeName && props.credentialTypeName === OPEN_AI_API_CREDENTIAL_TYPE,
);

const activeNodeHasOpenAiApiCredential = computed(
	() =>
		ndvStore.activeNode?.type &&
		NODES_WITH_OPEN_AI_API_CREDENTIAL.includes(ndvStore.activeNode.type),
);

const showCallout = computed(() => {
	return (
		userCanClaimOpenAiCredits.value &&
		(activeNodeHasOpenAiApiCredential.value || isEditingOpenAiCredential.value)
	);
});

const onClaimCreditsClicked = async () => {
	const success = await claimCredits('freeAiCreditsCallout');
	if (success) {
		showSuccessCallout.value = true;
	}
};
</script>
<template>
	<N8nCallout
		v-if="showCallout && !showSuccessCallout"
		theme="secondary"
		icon="circle-alert"
		class="mt-xs"
	>
		{{
			i18n.baseText('freeAi.credits.callout.claim.title', {
				interpolate: { credits: aiCreditsQuota },
			})
		}}
		<template #trailingContent>
			<N8nButton
				variant="subtle"
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
					interpolate: { credits: aiCreditsQuota },
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
