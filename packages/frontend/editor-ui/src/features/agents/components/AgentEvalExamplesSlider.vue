<script setup lang="ts">
/**
 * The slider-controlled batch of generated examples, plus the "add your own"
 * form. Split out of `InstanceAiTestAgentExamplesPanel` so the same picker can
 * also drive the evals-tab empty-state preview.
 */
import { computed, ref } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { ElSlider } from 'element-plus';
import { N8nIcon, N8nInput, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentEvalTryRow from '@/features/agents/components/AgentEvalTryRow.vue';

const props = defineProps<{
	/** Already fetched in full (up to 10) — the slider only trims the display. */
	examples: AgentEvalDraftCase[];
	/** True while the examples are still being generated — shows a skeleton in
	 *  place of the slider/list/input instead of an empty, interactive one. */
	loading?: boolean;
}>();

const emit = defineEmits<{
	'add-example': [input: string];
}>();

const i18n = useI18n();

// `examples` grows when the user adds their own (the parent appends the
// created case) — freeze the generated batch size at mount so the slider and
// the generated list never pick up those additions.
const generatedCount = props.examples.length;

const maxSliderValue = computed(() => Math.max(1, Math.min(10, generatedCount)));
const sliderValue = ref(Math.min(2, maxSliderValue.value));

const visibleExamples = computed(() => props.examples.slice(0, sliderValue.value));

const ownExamples = ref<string[]>([]);
const ownInput = ref('');

// N8nInput draws its border as a box-shadow ring, which can't be dashed —
// disable it here so the dashed `.addOwnInput` border underneath shows instead.
const addOwnInputStyle = {
	'--input--shadow': 'none',
	'--input--shadow--hover': 'none',
	'--input--shadow--focus': 'none',
	'--input--border--shadow': 'none',
	'--input--border--shadow--hover': 'none',
	'--input--border--shadow--focus': 'none',
	'--input--color--background': 'transparent',
};

function submitOwnExample() {
	const value = ownInput.value.trim();
	if (!value) return;
	ownExamples.value = [...ownExamples.value, value];
	emit('add-example', value);
	ownInput.value = '';
}

function cancelAddOwn() {
	ownInput.value = '';
}

const ownInputRef = ref<InstanceType<typeof N8nInput> | null>(null);

function focusOwnInput() {
	ownInputRef.value?.focus();
}

defineExpose({ sliderValue, focusOwnInput });
</script>

<template>
	<div v-if="loading" :class="$style.root" data-test-id="agent-eval-examples-slider-loading">
		<N8nLoading :rows="4" />
	</div>
	<div v-else :class="$style.root">
		<div :class="$style.sliderRow" data-test-id="instance-ai-test-agent-examples-slider">
			<ElSlider
				v-model="sliderValue"
				:min="1"
				:max="maxSliderValue"
				:step="1"
				:show-tooltip="false"
				:class="$style.slider"
			/>
			<div :class="$style.sliderLabels">
				<span :class="$style.sliderCount">
					{{
						i18n.baseText('instanceAi.testAgentPreview.examplesCount', {
							adjustToNumber: sliderValue,
							interpolate: { count: String(sliderValue) },
						})
					}}
				</span>
			</div>
		</div>

		<div :class="$style.exampleList">
			<AgentEvalTryRow
				v-for="(example, index) in visibleExamples"
				:key="index"
				status="idle"
				:input="example.input"
				:output="null"
				:label="example.scenario"
				test-id="instance-ai-test-agent-examples-example"
			/>
			<AgentEvalTryRow
				v-for="(example, index) in ownExamples"
				:key="`own-${index}`"
				status="idle"
				:input="example"
				:output="null"
				test-id="instance-ai-test-agent-examples-own-example"
			/>
		</div>

		<div :class="$style.addOwnForm">
			<N8nInput
				ref="ownInputRef"
				v-model="ownInput"
				:class="$style.addOwnInput"
				:style="addOwnInputStyle"
				:autosize="{ minRows: 1, maxRows: 4 }"
				:placeholder="i18n.baseText('instanceAi.testAgentPreview.addYourOwnExample')"
				data-test-id="instance-ai-test-agent-examples-add-own-input"
				@keydown.meta.enter="submitOwnExample"
				@keydown.enter="submitOwnExample"
				@keydown.esc="cancelAddOwn"
			>
				<template #prefix>
					<N8nIcon icon="plus" size="small" />
				</template>
			</N8nInput>
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

.sliderRow {
	position: relative;
	width: 100%;
}

.slider {
	width: 100%;
	cursor: ew-resize;

	:global(.el-slider__runway) {
		height: 44px;
		background-color: var(--run-data--color--background);
		border-radius: var(--radius--xl);
		border: var(--border);
		cursor: ew-resize;
	}

	:global(.el-slider__bar) {
		height: 44px;
		background-color: oklch(from var(--color--primary) l c h/.2);
		border-right: 1px solid var(--color--orange-500);
		border-radius: var(--radius--xl) 0 0 var(--radius--xl);
	}

	:global(.el-slider__button-wrapper) {
		top: 2px;
		cursor: ew-resize;
	}

	// The default round thumb reads as barely-there against the bar's own
	// 1px edge above. Flattened into a second, thicker bar — shifted left by
	// `margin-left` (the wrapper itself is centered exactly on the bar's edge
	// via `translateX(-50%)`, so without this the two bars sit flush on top
	// of each other instead of side by side) — so the pair reads as one
	// clearly visible handle.
	:global(.el-slider__button) {
		width: 3px;
		height: 15px;
		margin-left: -15px;
		border: none;
		border-radius: var(--radius--sm);
		background-color: var(--color--orange-500);
		box-shadow: none;
		cursor: ew-resize;
	}
}

.sliderLabels {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size--xs);

	width: 100%;
	height: 100%;
	padding: 0 var(--spacing--sm);
	pointer-events: none;
}

.sliderCount {
	font-weight: var(--font-weight--bold);
	color: var(--text-color--dark);
}

.exampleList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.addOwnInput {
	border: 1px dashed oklch(88.53% 0 89.88);
	border-radius: var(--radius--lg);
}

.addOwnForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
