<script setup lang="ts">
/**
 * The slider-controlled batch of generated examples, plus the "add your own"
 * form. Split out of `InstanceAiTestAgentExamplesPanel` so the same picker can
 * also drive the evals-tab empty-state preview.
 */
import { computed, ref, watch } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { ElSlider } from 'element-plus';
import { N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentAvatar from '@/features/agents/components/AgentAvatar.vue';
import AgentEvalTryRow from '@/features/agents/components/AgentEvalTryRow.vue';

const props = defineProps<{
	/** Already fetched in full (up to 10) — the slider only trims the display. */
	examples: AgentEvalDraftCase[];
	/** True while the examples are still being generated — shows a skeleton in
	 *  place of the slider/list/input instead of an empty, interactive one. */
	loading?: boolean;
	/** No `agent:update` — the add-your-own input is read-only. */
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'add-example': [input: string];
}>();

const i18n = useI18n();

// Reactive, not a frozen snapshot: both callers mount this before generation
// resolves (showing the `loading` state below with `examples` still `[]`),
// then swap in the real batch once — so a value read once at setup would
// permanently see `0`, pinning `maxSliderValue` at 1 and leaving the slider
// stuck with no range to drag (and ElSlider computing a `0/0` position).
// A user's own additions never land in `examples` (they're tracked in a
// separate list by the caller), so nothing here needs to stay frozen against
// that growth.
const maxSliderValue = computed(() => Math.max(1, Math.min(10, props.examples.length)));
const sliderValue = ref(Math.min(2, maxSliderValue.value));

// Picks the slider's starting position the moment the real batch lands,
// since the initial `ref()` above only ever sees the pre-generation `[]`.
watch(
	() => props.examples.length,
	(length, previousLength) => {
		if (previousLength === 0 && length > 0) {
			sliderValue.value = Math.min(2, maxSliderValue.value);
		}
	},
);

const visibleExamples = computed(() => props.examples.slice(0, sliderValue.value));

type OwnExample = { id: number; input: string };
const ownExamples = ref<OwnExample[]>([]);
// An incrementing counter, not the input text — two own examples with the same
// wording would otherwise collide on the same key, and Vue would reuse the
// wrong row's local state (`AgentEvalTryRow`'s own expanded/suggestion refs)
// between them during a keyed list update.
let nextOwnExampleId = 0;
const ownInput = ref('');

const customLabel = computed(() => i18n.baseText('instanceAi.testAgentPreview.customExampleLabel'));

type DisplayExample = { id: string; input: string; label: string };

// Newest first: the slider reveals examples in increasing index order, so
// reversing puts whichever one just became visible at the top instead of
// tacked onto the bottom. Keyed by its original index in `props.examples`
// (stable — that array is never reordered after it's first populated), not by
// input text, since two generated cases can share the same wording.
const generatedDisplay = computed<DisplayExample[]>(() =>
	visibleExamples.value
		.map((example, index) => ({
			id: `gen:${index}`,
			input: example.input,
			label: example.scenario,
		}))
		.reverse(),
);

// Own additions prepend (see `submitOwnExample`), so this is already newest
// first — and sits above the generated block, since typing one is a more
// deliberate "just happened" action than the slider's own reveal order.
const ownDisplay = computed<DisplayExample[]>(() =>
	ownExamples.value.map(({ id, input }) => ({ id: `own:${id}`, input, label: customLabel.value })),
);

const allDisplayExamples = computed<DisplayExample[]>(() => [
	...ownDisplay.value,
	...generatedDisplay.value,
]);

// Past a handful, the list collapses to a peek with a "+N more" toggle —
// same pattern as the settled-run summary pill.
const COLLAPSED_ROW_COUNT = 3;
const expanded = ref(false);
const hasOverflow = computed(() => allDisplayExamples.value.length > COLLAPSED_ROW_COUNT);
const shownExamples = computed(() =>
	expanded.value || !hasOverflow.value
		? allDisplayExamples.value
		: allDisplayExamples.value.slice(0, COLLAPSED_ROW_COUNT),
);
const hiddenExampleCount = computed(() =>
	Math.max(0, allDisplayExamples.value.length - COLLAPSED_ROW_COUNT),
);

function toggleExpanded() {
	expanded.value = !expanded.value;
}

function submitOwnExample() {
	const value = ownInput.value.trim();
	if (!value) return;
	// Prepended, not appended — see `ownDisplay` above.
	ownExamples.value = [{ id: nextOwnExampleId++, input: value }, ...ownExamples.value];
	emit('add-example', value);
	ownInput.value = '';
}

function cancelAddOwn() {
	ownInput.value = '';
}

const ownInputRef = ref<HTMLInputElement | null>(null);

function focusOwnInput() {
	ownInputRef.value?.focus();
}

defineExpose({ sliderValue, focusOwnInput });
</script>

<template>
	<div
		v-if="loading"
		:class="[$style.root, $style.loadingRow]"
		data-test-id="agent-eval-examples-slider-loading"
	>
		<N8nSpinner size="small" />
		<N8nText color="text-base">
			{{ i18n.baseText('instanceAi.testAgentPreview.generatingSuite') }}
		</N8nText>
	</div>
	<div v-else :class="$style.root">
		<div :class="$style.sliderRow" data-test-id="instance-ai-test-agent-examples-slider">
			<N8nText :class="$style.sliderCount" bold size="small">
				{{
					i18n.baseText('instanceAi.testAgentPreview.examplesCount', {
						adjustToNumber: sliderValue,
						interpolate: { count: String(sliderValue) },
					})
				}}
			</N8nText>
			<ElSlider
				v-model="sliderValue"
				:min="1"
				:max="maxSliderValue"
				:step="1"
				:show-tooltip="false"
				:class="$style.slider"
				size="small"
			/>
		</div>

		<div :class="$style.exampleList">
			<AgentEvalTryRow
				v-for="example in shownExamples"
				:key="example.id"
				status="idle"
				:input="example.input"
				:output="null"
				:label="example.label"
				:test-id="
					example.id.startsWith('own:')
						? 'instance-ai-test-agent-examples-own-example'
						: 'instance-ai-test-agent-examples-example'
				"
			/>
			<button
				v-if="hasOverflow"
				type="button"
				:class="$style.toggleRow"
				data-test-id="instance-ai-test-agent-examples-toggle-more"
				@click="toggleExpanded"
			>
				<N8nText size="small" color="text-dark">
					{{
						expanded
							? i18n.baseText('instanceAi.testAgentPreview.showFewerExamples')
							: i18n.baseText('instanceAi.testAgentPreview.showMoreExamples', {
									interpolate: { count: String(hiddenExampleCount) },
								})
					}}
				</N8nText>
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
		</div>

		<div :class="$style.addOwnForm">
			<AgentAvatar kind="idle" size="xs" />
			<div :class="$style.addOwnFormHeader">
				<label for="ownInput">
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('instanceAi.testAgentPreview.customExampleLabel') }}
					</N8nText>
				</label>
				<input
					ref="ownInputRef"
					v-model="ownInput"
					name="ownInput"
					:class="$style.addOwnInput"
					:placeholder="i18n.baseText('instanceAi.testAgentPreview.addYourOwnExample')"
					:disabled="disabled"
					data-test-id="instance-ai-test-agent-examples-add-own-input"
					@keydown.meta.enter="submitOwnExample"
					@keydown.enter.exact="submitOwnExample"
					@keydown.esc="cancelAddOwn"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--sm);
	width: 100%;
}

// `--out` and `--primary-100` aren't real tokens — an unresolvable `var()`
// inside the `animation` shorthand makes the whole declaration invalid at
// computed-value time, so this never played at all (not even on first
// mount, let alone when a row was added).
@keyframes exr-in {
	0% {
		opacity: 0;
		translate: 0 -4px;
		background: var(--color--orange-alpha-100);
	}

	100% {
		opacity: 1;
		translate: 0 0;
	}
}

.loadingRow {
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sliderRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;
}

.slider {
	flex: 1;
	cursor: ew-resize;

	:global(.el-slider__runway) {
		background-color: var(--run-data--color--background);
		border: none;
		cursor: ew-resize;
	}

	:global(.el-slider__bar) {
		background-color: var(--color--orange-500);
		border-radius: var(--radius--full);
	}

	:global(.el-slider__button-wrapper) {
		cursor: ew-resize;
	}

	:global(.el-slider__button) {
		width: 18px;
		height: 18px;
		border: 1px solid var(--color--orange-500);
		background-color: var(--background--surface);
		box-shadow: none;
		cursor: ew-resize;
	}
}

.sliderCount {
	flex-shrink: 0;
	color: var(--text-color--dark);
}

.exampleList {
	display: flex;
	flex-direction: column;
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--lg);
	// Clips the toggle row's own background to the list's rounded corners when
	// it lands last.
	overflow: hidden;
}

.exampleList > * {
	border-bottom: var(--border);
	// 10px (right) has no matching token between 8px and 12px — kept as a
	// literal for the extra breathing room next to the row's chevron/icon.
	padding: var(--spacing--3xs) 10px var(--spacing--3xs) var(--spacing--2xs);
	animation: exr-in 220ms var(--easing--ease-out) both;
}

.exampleList > *:last-of-type {
	border-bottom: none;
}

.toggleRow {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	width: 100%;
	background-color: var(--run-data--color--background);
	border: none;
	cursor: pointer;
	color: var(--text-color--dark);
}

.addOwnForm {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	// 10px (right) has no matching token between 8px and 12px — kept as a
	// literal for the extra breathing room next to the row's chevron/icon.
	padding: var(--spacing--3xs) 10px var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.addOwnFormHeader {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.addOwnInput {
	flex: 1;
	min-width: 0;
	padding: 0;
	border: none;
	outline: none;
	background: transparent;
	font-size: var(--font-size--2xs);
	color: var(--text-color--dark);

	// A native `<input>` draws the browser's own focus ring by default — reset
	// it here rather than globally, so other inputs keep theirs.
	&:focus,
	&:focus-visible {
		border: none;
		outline: none;
		box-shadow: none;
	}
}
</style>
