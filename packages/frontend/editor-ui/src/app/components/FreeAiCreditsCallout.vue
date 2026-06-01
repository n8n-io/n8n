<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { useFreeAiCredits } from '@/app/composables/useFreeAiCredits';
import { computed } from 'vue';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';

type Props = {
	credentialTypeName?: string;
	telemetrySource?: 'freeAiCreditsCallout' | 'instanceAiWorkflowSetup';
};

const props = withDefaults(defineProps<Props>(), {
	telemetrySource: 'freeAiCreditsCallout',
});

const emit = defineEmits<{ claimed: [] }>();

const LANGCHAIN_NODES_PREFIX = '@n8n/n8n-nodes-langchain.';
const N8N_NODES_PREFIX = '@n8n/n8n-nodes.';

const NODES_WITH_OPEN_AI_API_CREDENTIAL = [
	`${LANGCHAIN_NODES_PREFIX}openAi`,
	`${LANGCHAIN_NODES_PREFIX}embeddingsOpenAi`,
	`${LANGCHAIN_NODES_PREFIX}lmChatOpenAi`,
	`${N8N_NODES_PREFIX}openAi`,
];

const ndvStore = injectNDVStore();
const i18n = useI18n();

const {
	aiCreditsQuota,
	userCanClaimOpenAiCredits,
	claimingCredits,
	showSuccessCallout,
	claimCredits,
} = useFreeAiCredits();

const isEditingOpenAiCredential = computed(
	() => props.credentialTypeName && props.credentialTypeName === OPEN_AI_API_CREDENTIAL_TYPE,
);

const activeNodeHasOpenAiApiCredential = computed(
	() =>
		ndvStore.value.activeNode?.type &&
		NODES_WITH_OPEN_AI_API_CREDENTIAL.includes(ndvStore.value.activeNode.type),
);

const isRelevantContext = computed(
	() => activeNodeHasOpenAiApiCredential.value || isEditingOpenAiCredential.value,
);

const showCallout = computed(() => userCanClaimOpenAiCredits.value && isRelevantContext.value);

const showSuccess = computed(() => showSuccessCallout.value && isRelevantContext.value);

const onClaimCreditsClicked = async () => {
	const success = await claimCredits(props.telemetrySource);
	if (success) {
		emit('claimed');
	}
};
</script>
<template>
	<N8nCallout
		v-if="showCallout && !showSuccess"
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
	<N8nCallout v-else-if="showSuccess" theme="success" icon="circle-check" class="mt-xs">
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
