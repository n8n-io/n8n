<script setup lang="ts">
import { formatTokenUsageCount } from '@/components/RunDataAi/utils';
import { useI18n } from '@/composables/useI18n';
import { type LlmTokenUsageData } from '@/Interface';
import { N8nTooltip } from '@n8n/design-system';

const { consumedTokens } = defineProps<{ consumedTokens: LlmTokenUsageData }>();
const locale = useI18n();
</script>

<template>
	<N8nTooltip v-if="consumedTokens !== undefined" :enterable="false">
		<span>{{
			locale.baseText('runData.aiContentBlock.tokens', {
				interpolate: {
					count: formatTokenUsageCount(consumedTokens, 'total'),
				},
			})
		}}</span>
		<template #content>
			<ConsumedTokensDetails :consumed-tokens="consumedTokens" />
		</template>
	</N8nTooltip>
</template>
