<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { type LlmTokenUsageData } from '@/Interface';
import { formatTokenUsageCount } from '@/utils/aiUtils';
import { N8nText } from '@n8n/design-system';

const { consumedTokens } = defineProps<{ consumedTokens: LlmTokenUsageData }>();
const i18n = useI18n();
</script>

<template>
	<div>
		<N8nText :bold="true" size="small">
			{{ i18n.baseText('runData.aiContentBlock.tokens.prompt') }}
			{{
				i18n.baseText('runData.aiContentBlock.tokens', {
					interpolate: {
						count: formatTokenUsageCount(consumedTokens, 'prompt'),
					},
				})
			}}
		</N8nText>
		<br />
		<N8nText :bold="true" size="small">
			{{ i18n.baseText('runData.aiContentBlock.tokens.completion') }}
			{{
				i18n.baseText('runData.aiContentBlock.tokens', {
					interpolate: {
						count: formatTokenUsageCount(consumedTokens, 'completion'),
					},
				})
			}}
		</N8nText>
	</div>
</template>
