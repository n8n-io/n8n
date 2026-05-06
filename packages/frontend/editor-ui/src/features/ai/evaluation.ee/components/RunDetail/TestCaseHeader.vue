<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
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

		<div :class="$style.rightGroup">
			<N8nTooltip
				v-if="executionId"
				:content="locale.baseText('evaluation.runDetail.testCase.viewLink')"
				placement="top"
			>
				<button
					type="button"
					class="open-execution-link"
					:class="$style.viewIcon"
					data-test-id="test-case-view-link"
					:aria-label="locale.baseText('evaluation.runDetail.testCase.viewLink')"
					@click.stop="emit('view')"
				>
					<N8nIcon icon="external-link" size="small" />
				</button>
			</N8nTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: 28px;
	// N8nCard's header slot wraps us in another flex container, so we must
	// span its full width for justify-content: space-between to actually
	// push leftGroup and rightGroup to opposite edges.
	flex: 1 1 auto;
	width: 100%;
}

.leftGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.rightGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 0 0 auto;
}

.meta {
	color: var(--color--text--tint-1);
}

.dot {
	color: var(--color--text--tint-1);
}

.viewIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border: none;
	background: none;
	color: var(--color--text--tint-1);
	cursor: pointer;
	transition: color var(--animation--duration) var(--animation--easing);

	&:hover {
		color: var(--color--text);
	}
}
</style>
