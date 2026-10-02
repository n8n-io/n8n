<script setup lang="ts">
/**
 * The slider-controlled batch of generated examples, plus the "add your own"
 * form. Split out of `InstanceAiTestAgentExamplesPanel` so the same picker can
 * also drive the evals-tab empty-state preview.
 */
import { computed, ref } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { ElSlider } from 'element-plus';
import { N8nIcon, N8nInput, N8nSpinner, N8nText } from '@n8n/design-system';
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
}

.exampleList > * {
	border-bottom: var(--border);
	padding: 6px 10px 6px 8px;
}

.exampleList > *:last-of-type {
	border-bottom: none;
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
