<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nExternalLink, N8nIcon, N8nIconButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { formatDuration, formatTokens } from '../../evaluation.utils';
import type { TestCaseExecutionStatus } from '../../evaluation.api';

const props = defineProps<{
	index: number;
	status: TestCaseExecutionStatus;
	tokens: number | undefined;
	durationMs: number | undefined;
	executionId: string | null | undefined;
	cancelDisabled?: boolean;
}>();

const emit = defineEmits<{
	view: [];
	cancel: [];
}>();

const locale = useI18n();

const tokensLabel = computed(() => formatTokens(props.tokens));
const durationLabel = computed(() => formatDuration(props.durationMs));
const hasMetadata = computed(
	() =>
		(props.status === 'success' || props.status === 'error') &&
		(props.tokens !== undefined || props.durationMs !== undefined),
);
const isPending = computed(() => props.status === 'new');
const isRunning = computed(
	() => props.status === 'running' || props.status === 'evaluation_running',
);
const isCancelled = computed(() => props.status === 'cancelled');
const isFailed = computed(() => props.status === 'error');
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
			<template v-if="isPending">
				<N8nText size="small" :class="$style.meta">
					{{ locale.baseText('evaluation.runDetail.testCase.pending') }}
				</N8nText>
				<N8nIconButton
					icon="x"
					type="tertiary"
					size="mini"
					:disabled="cancelDisabled"
					data-test-id="test-case-cancel-button"
					:title="locale.baseText('evaluation.runDetail.testCase.cancel')"
					@click.stop="emit('cancel')"
				/>
			</template>
			<template v-else-if="isRunning">
				<N8nSpinner size="small" />
				<N8nText size="small" :class="$style.meta">
					{{ locale.baseText('evaluation.runDetail.testCase.running') }}
				</N8nText>
			</template>
			<template v-else-if="isCancelled">
				<N8nText size="small" :class="$style.meta">
					{{ locale.baseText('evaluation.runDetail.testCase.cancelled') }}
				</N8nText>
			</template>
			<template v-else-if="isFailed">
				<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<N8nText size="small" :class="$style.errorText">
					{{ locale.baseText('evaluation.runDetail.testCase.failed') }}
				</N8nText>
				<N8nExternalLink
					v-if="executionId"
					class="open-execution-link"
					data-test-id="test-case-view-link"
					@click.stop.prevent="emit('view')"
				>
					{{ locale.baseText('evaluation.runDetail.testCase.viewLink') }}
				</N8nExternalLink>
			</template>
			<template v-else>
				<N8nExternalLink
					v-if="executionId"
					class="open-execution-link"
					data-test-id="test-case-view-link"
					@click.stop.prevent="emit('view')"
				>
					{{ locale.baseText('evaluation.runDetail.testCase.viewLink') }}
				</N8nExternalLink>
			</template>
		</div>
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

.rightGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.meta {
	color: var(--color--text--tint-1);
}

.dot {
	color: var(--color--text--tint-1);
}

.errorIcon {
	color: var(--text-color--danger);
}

.errorText {
	color: var(--text-color--danger);
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
