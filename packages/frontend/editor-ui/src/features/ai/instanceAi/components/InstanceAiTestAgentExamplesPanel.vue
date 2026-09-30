<script setup lang="ts">
/**
 * Shown after "Looks good" on the preview popup: the confirmed try, plus a
 * slider-controlled batch of additional generated examples the user can trim,
 * extend with their own, and hand off to a real check via "Check your agent".
 */
import { computed, ref } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { ElSlider } from 'element-plus';
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentEvalTryRow from '@/features/agents/components/AgentEvalTryRow.vue';

const props = defineProps<{
	previewInput: string;
	previewOutput: string;
	/** Already fetched in full (up to 10) — the slider only trims the display. */
	examples: AgentEvalDraftCase[];
	addingExample?: boolean;
}>();

const emit = defineEmits<{
	'add-example': [input: string];
	'check-agent': [count: number];
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

function onCheckYourAgent() {
	emit('check-agent', sliderValue.value);
}
</script>

<template>
	<div :class="$style.root">
		<AgentEvalTryRow
			status="pass"
			:input="previewInput"
			:output="previewOutput"
			:label="i18n.baseText('instanceAi.testAgentPreview.yourTry')"
			test-id="instance-ai-test-agent-examples-try"
		/>

		<N8nText color="text-light" size="small">
			{{ i18n.baseText('instanceAi.testAgentPreview.savedAsFirstCheck') }}
		</N8nText>

		<hr :class="$style.divider" />

		<N8nText color="text-dark" :class="$style.checkMoreExamplesHint">
			{{ i18n.baseText('instanceAi.testAgentPreview.checkMoreExamples') }}
		</N8nText>

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

		<N8nButton
			variant="solid"
			size="small"
			data-test-id="instance-ai-test-agent-examples-check-agent"
			@click="onCheckYourAgent"
		>
			{{ i18n.baseText('instanceAi.testAgentPreview.checkYourAgent') }}
		</N8nButton>
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

.tryCard {
	width: 100%;
}

.checkMoreExamplesHint {
	font-weight: bolder;
}

.divider {
	width: 100%;
	margin: 0;
	border: none;
	border-top: var(--border);
}

.sliderRow {
	position: relative;
	width: 100%;
}

.slider {
	width: 100%;

	:global(.el-slider__runway) {
		height: 44px;
		background-color: var(--run-data--color--background);
		border-radius: var(--radius--xl);
		border: var(--border);
	}

	:global(.el-slider__bar) {
		height: 44px;
		background-color: oklch(from var(--color--primary) l c h/.2);
		border-right: 1px solid var(--color--orange-500);
		border-radius: var(--radius--xl) 0 0 var(--radius--xl);
	}

	:global(.el-slider__button-wrapper) {
		top: 2px;
	}

	:global(.el-slider__button) {
		border-color: var(--color--primary);
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

.sliderToTry {
	color: var(--text-color--subtler);
}

.exampleList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.addOwn {
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
