<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nExternalLink, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { formatDuration, formatTokens } from '../../evaluation.utils';
import { useCyclingVerb } from '../../composables/useCyclingVerb';
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
	rerun: [];
}>();

const locale = useI18n();

const tokensLabel = computed(() => formatTokens(props.tokens));
const durationLabel = computed(() => formatDuration(props.durationMs));
const isFinished = computed(() => props.status === 'success' || props.status === 'error');
const isPending = computed(() => props.status === 'new');
const isRunning = computed(
	() => props.status === 'running' || props.status === 'evaluation_running',
);
const isCancelled = computed(() => props.status === 'cancelled');
const isFailed = computed(() => props.status === 'error');

const hasMetadata = computed(
	() => isFinished.value && (props.tokens !== undefined || props.durationMs !== undefined),
);

const cyclingVerb = useCyclingVerb();
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
				<N8nIcon icon="circle" size="small" :class="$style.pendingIcon" />
				<N8nButton
					type="tertiary"
					size="mini"
					:label="locale.baseText('evaluation.runDetail.testCase.cancel')"
					:disabled="cancelDisabled"
					data-test-id="test-case-cancel-button"
					@click.stop="emit('cancel')"
				/>
			</template>
			<template v-else-if="isRunning">
				<N8nSpinner size="small" />
				<N8nText size="small" :class="$style.runningVerb">{{ cyclingVerb }}…</N8nText>
			</template>
			<template v-else-if="isCancelled">
				<N8nText size="small" :class="$style.meta">
					{{ locale.baseText('evaluation.runDetail.testCase.cancelled') }}
				</N8nText>
			</template>
			<template v-else-if="isFailed">
				<N8nButton
					type="secondary"
					size="mini"
					:label="locale.baseText('evaluation.runDetail.testCase.rerun')"
					data-test-id="test-case-rerun-button"
					@click.stop="emit('rerun')"
				/>
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
@use '@n8n/design-system/css/mixins/animations' as animations;

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: 28px;
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

.pendingIcon {
	color: var(--color--text--tint-1);
}

.runningVerb {
	@include animations.shimmer;
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
