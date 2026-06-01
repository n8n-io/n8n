<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nSpinner, N8nText, N8nTooltip } from '@n8n/design-system';
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
const isFinished = computed(
	() => props.status === 'success' || props.status === 'error' || props.status === 'warning',
);
const isPending = computed(() => props.status === 'new');
const isRunning = computed(
	() => props.status === 'running' || props.status === 'evaluation_running',
);
const isCancelled = computed(() => props.status === 'cancelled');
const isFailed = computed(() => props.status === 'error' || props.status === 'warning');

const hasMetadata = computed(
	() => isFinished.value && (props.tokens !== undefined || props.durationMs !== undefined),
);

const cyclingVerbKey = useCyclingVerb(isRunning);
</script>

<template>
	<div :class="$style.header" data-test-id="test-case-header">
		<div :class="[$style.leftGroup, { [$style.shimmering]: isRunning }]">
			<N8nSpinner v-if="isRunning" size="small" :class="$style.leadingSpinner" />
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
					variant="ghost"
					size="mini"
					:label="locale.baseText('evaluation.runDetail.testCase.cancel')"
					:disabled="cancelDisabled"
					data-test-id="test-case-cancel-button"
					@click.stop="emit('cancel')"
				/>
			</template>
			<template v-else-if="isRunning">
				<N8nText size="small" :class="$style.runningVerb">
					{{ locale.baseText(cyclingVerbKey) }}…
				</N8nText>
			</template>
			<template v-else-if="isCancelled">
				<N8nText size="small" :class="$style.meta">
					{{ locale.baseText('evaluation.runDetail.testCase.cancelled') }}
				</N8nText>
			</template>
			<template v-else-if="isFailed">
				<N8nButton
					variant="outline"
					size="mini"
					:label="locale.baseText('evaluation.runDetail.testCase.rerun')"
					data-test-id="test-case-rerun-button"
					@click.stop="emit('rerun')"
				/>
			</template>
			<template v-else>
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
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

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

// When the test case is running, shimmer the entire leading group so the
// "Test #N" label matches the cycling verb on the right. The mixin paints
// a moving gradient across `color` only, so the spinner (svg fill) keeps
// its own color.
.shimmering {
	@include motion.shimmer;
}

.leadingSpinner {
	flex: 0 0 auto;
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

.pendingIcon {
	color: var(--color--text--tint-1);
}

.runningVerb {
	@include motion.shimmer;
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
