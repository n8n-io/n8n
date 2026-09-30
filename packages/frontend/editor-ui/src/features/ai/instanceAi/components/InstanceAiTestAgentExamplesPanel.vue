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
import EvalInitialSample from '@/features/agents/components/EvalInitialSample.vue';
import AgentAvatar from '@/features/agents/components/AgentAvatar.vue';

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

const tryExpanded = ref(false);

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

function toggleTryExpanded() {
	tryExpanded.value = !tryExpanded.value;
}

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
		<div :class="$style.tryRow">
			<span :class="$style.iconWrapSuccess">
				<AgentAvatar kind="pass" size="sm" />
			</span>
			<N8nText color="text-light" size="small">{{
				i18n.baseText('instanceAi.testAgentPreview.yourTry')
			}}</N8nText>
			<N8nText color="text-dark" :class="$style.tryInput" size="small">{{ previewInput }}</N8nText>
			<button
				type="button"
				:class="$style.expandToggle"
				data-test-id="instance-ai-test-agent-examples-try-toggle"
				@click="toggleTryExpanded"
			>
				<N8nIcon :icon="tryExpanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
		</div>
		<div
			v-if="tryExpanded"
			:class="$style.tryPlaceholder"
			data-test-id="instance-ai-test-agent-examples-try-placeholder"
		>
			<EvalInitialSample :preview-input="previewInput" :preview-output="previewOutput ?? ''" />
		</div>

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
			<div
				v-for="(example, index) in visibleExamples"
				:key="index"
				:class="$style.exampleRow"
				data-test-id="instance-ai-test-agent-examples-example"
			>
				<span :class="$style.iconWrap">
					<AgentAvatar kind="idle" size="sm" />
				</span>
				<N8nText :class="$style.exampleText" size="small">{{ example.input }}</N8nText>
			</div>
			<div
				v-for="(example, index) in ownExamples"
				:key="`own-${index}`"
				:class="$style.exampleRow"
				data-test-id="instance-ai-test-agent-examples-own-example"
			>
				<span :class="$style.iconWrap">
					<AgentAvatar kind="idle" size="sm" />
				</span>
				<N8nText :class="$style.exampleText" size="small">{{ example }}</N8nText>
			</div>
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

.tryRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	border: var(--border);
	padding: var(--spacing--3xs);
	border-radius: var(--radius--lg);
}

.checkMoreExamplesHint {
	font-weight: bolder;
}

.tryInput {
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.expandToggle {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--text-color--subtler);
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

.exampleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	border: var(--border);
	padding: var(--spacing--3xs);
	border-radius: var(--radius--lg);
}

.exampleText {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	border-radius: var(--radius--2xs);
}

.iconWrap,
.iconWrapSuccess {
	width: 20px;
	height: 20px;
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	background-color: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius);
}

.iconWrapSuccess {
	border-color: var(--color--success);
	background-color: var(--color--success--tint-2);
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
