<script lang="ts" setup>
import { onMounted } from 'vue';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiPromptSuggestionsTelemetry } from '@/features/ai/instanceAi/instanceAiPromptSuggestions.telemetry';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { TemplateClickSource, trackTemplatesClick } from '@/experiments/utils';
import {
	INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION,
	type SplitEmptyStateExample,
	type SplitEmptyStateSuggestionSubmitPayload,
} from '../examples';

const props = withDefaults(
	defineProps<{
		examples: readonly SplitEmptyStateExample[];
		activeIndex: number;
		disabled?: boolean;
		intervalMs?: number;
		paused?: boolean;
	}>(),
	{ disabled: false, intervalMs: 5000, paused: false },
);

const emit = defineEmits<{
	submit: [payload: SplitEmptyStateSuggestionSubmitPayload];
	edit: [payload: SplitEmptyStateSuggestionSubmitPayload];
	hover: [index: number];
	'hover-end': [];
}>();

const i18n = useI18n();
const telemetry = useInstanceAiPromptSuggestionsTelemetry();
const templatesStore = useTemplatesStore();

onMounted(() => {
	telemetry.trackSuggestionsShown({
		suggestionCatalogVersion: INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION,
	});
});

function buildPayload(
	example: SplitEmptyStateExample,
	index: number,
): SplitEmptyStateSuggestionSubmitPayload {
	return {
		promptKey: example.promptKey,
		suggestionId: example.id,
		suggestionKind: 'quick_example',
		position: index + 1,
	};
}

function handleRowClick(example: SplitEmptyStateExample, index: number) {
	emit('submit', buildPayload(example, index));
}

function handleEditClick(event: MouseEvent, example: SplitEmptyStateExample, index: number) {
	event.stopPropagation();
	emit('edit', buildPayload(example, index));
}

function handleRowMouseenter(index: number) {
	emit('hover', index);
}

function handleRowsMouseleave() {
	emit('hover-end');
}

function handleSeeMoreClick() {
	trackTemplatesClick(TemplateClickSource.instanceAiSplitEmptyState);
}
</script>

<template>
	<div :class="$style.examples" data-test-id="instance-ai-examples">
		<N8nText size="xsmall" bold :class="$style.label">
			{{ i18n.baseText('experiments.instanceAiSplitEmptyState.examples.startFromAnExample') }}
		</N8nText>
		<div
			:class="$style.rows"
			data-test-id="instance-ai-examples-rows"
			@mouseleave="handleRowsMouseleave"
		>
			<div
				v-for="(example, index) in props.examples"
				:key="example.id"
				:class="[$style.row, index === props.activeIndex && $style.rowActive]"
				:data-test-id="`instance-ai-examples-item-${example.id}`"
				@mouseenter="handleRowMouseenter(index)"
			>
				<button
					type="button"
					:class="$style.rowMain"
					:disabled="props.disabled"
					:data-test-id="`instance-ai-examples-suggestion-${example.id}`"
					@click="handleRowClick(example, index)"
				>
					<N8nText size="small">{{ i18n.baseText(example.titleKey) }}</N8nText>
					<N8nIcon
						v-if="index === props.activeIndex"
						icon="arrow-right"
						size="small"
						:class="$style.rowArrow"
					/>
					<div
						v-if="index === props.activeIndex"
						:key="props.activeIndex"
						:class="$style.loadingBar"
						:style="{
							animationDuration: `${props.intervalMs}ms`,
							animationPlayState: props.paused ? 'paused' : 'running',
						}"
						data-test-id="instance-ai-examples-loading-bar"
					/>
				</button>
				<button
					type="button"
					:class="$style.rowEdit"
					:disabled="props.disabled"
					:aria-label="i18n.baseText('experiments.instanceAiSplitEmptyState.examples.editPrompt')"
					:title="i18n.baseText('experiments.instanceAiSplitEmptyState.examples.editPrompt')"
					:data-test-id="`instance-ai-examples-edit-${example.id}`"
					@click="handleEditClick($event, example, index)"
				>
					<N8nIcon icon="pencil" size="small" />
				</button>
			</div>
		</div>
		<N8nLink
			:class="$style.seeMore"
			:to="templatesStore.websiteTemplateRepositoryURL"
			new-window
			size="small"
			data-test-id="instance-ai-examples-see-more"
			@click="handleSeeMoreClick"
		>
			{{ i18n.baseText('experiments.instanceAiSplitEmptyState.examples.seeMore') }}
			<N8nIcon icon="arrow-up-right" size="xsmall" />
		</N8nLink>
	</div>
</template>

<style lang="scss" module>
.examples {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--3xs);
}

.label {
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.rows {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--5xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color--text);
	white-space: normal;

	:global(.n8n-text) {
		font-weight: var(--font-weight--medium);
	}
}

.rowMain {
	position: relative;
	overflow: hidden;
	display: inline-flex;
	flex: 1;
	min-width: 0;
	align-items: center;
	justify-content: flex-start;
	padding: var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius--xs);
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;

	.row:not(.rowActive) &:hover {
		background-color: var(--color--background--light-1);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
}

.rowActive .rowMain {
	background-color: color-mix(in srgb, var(--color--primary) 12%, transparent);
}

.rowArrow {
	margin-left: auto;
	flex: 0 0 auto;
	color: var(--color--primary);
}

.rowEdit {
	flex: 0 0 auto;
	margin-right: var(--spacing--2xs);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xs);
	border: 0;
	border-radius: var(--radius--sm);
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
	opacity: 0;
	transition:
		opacity 0.12s ease,
		background-color 0.12s ease,
		color 0.12s ease;

	.row:hover &,
	.row:focus-within & {
		opacity: 1;
	}

	&:hover {
		opacity: 1;
		background-color: var(--color--foreground--base);
		color: var(--color--text--shade-1);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0;
	}
}

.loadingBar {
	position: absolute;
	bottom: 0;
	left: 0;
	height: 2px;
	width: 0;
	background-color: var(--color--primary);
	animation: progressBar linear forwards;
}

@keyframes progressBar {
	from {
		width: 0;
	}
	to {
		width: 100%;
	}
}

.seeMore {
	align-self: flex-start;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	white-space: nowrap;

	&:hover {
		text-decoration: underline;
	}
}
</style>
