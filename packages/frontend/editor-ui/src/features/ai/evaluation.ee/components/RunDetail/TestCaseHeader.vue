<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nExternalLink, N8nText } from '@n8n/design-system';
import { formatDuration, formatTokens } from '../../evaluation.utils';

const props = defineProps<{
	index: number;
	tokens: number | undefined;
	durationMs: number | undefined;
	executionId: string | null | undefined;
}>();

const emit = defineEmits<{
	view: [];
}>();

const locale = useI18n();

const tokensLabel = computed(() => formatTokens(props.tokens));
const durationLabel = computed(() => formatDuration(props.durationMs));
const hasMetadata = computed(() => props.tokens !== undefined || props.durationMs !== undefined);
</script>

<template>
	<div :class="$style.header" data-test-id="test-case-header">
		<div :class="$style.leftGroup">
			<N8nText size="medium" bold>
				{{ locale.baseText('evaluation.runDetail.testCase.title', { interpolate: { index } }) }}
			</N8nText>
			<template v-if="hasMetadata">
				<N8nText v-if="tokens !== undefined" size="small" :class="$style.meta">
					{{ tokensLabel }}
				</N8nText>
				<N8nText
					v-if="tokens !== undefined && durationMs !== undefined"
					size="small"
					:class="$style.dot"
				>
					·
				</N8nText>
				<N8nText v-if="durationMs !== undefined" size="small" :class="$style.meta">
					{{ durationLabel }}
				</N8nText>
			</template>
		</div>
		<N8nExternalLink
			v-if="executionId"
			class="open-execution-link"
			data-test-id="test-case-view-link"
			@click.stop.prevent="emit('view')"
		>
			{{ locale.baseText('evaluation.runDetail.testCase.viewLink') }}
		</N8nExternalLink>
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.leftGroup {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.meta {
	color: var(--color--text--tint-1);
}

.dot {
	color: var(--color--text--tint-1);
}

.header :global(.open-execution-link) {
	color: var(--color--primary);
	font-weight: var(--font-weight--medium);
	text-decoration: underline;

	&:hover {
		color: var(--color--primary--shade-1);
	}
}
</style>
