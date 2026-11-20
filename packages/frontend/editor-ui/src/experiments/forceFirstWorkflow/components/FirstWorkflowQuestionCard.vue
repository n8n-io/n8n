<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import FirstWorkflowFormatPreview from './FirstWorkflowFormatPreview.vue';
import {
	DEFAULT_SCHEDULE_TIME,
	DESTINATION_OPTIONS,
	FORMAT_OPTIONS,
	PROVIDER_OPTIONS,
	QUESTION_IDS,
	SCHEDULE_TIMES,
	formatTime,
	parseTimeInput,
	type ChoiceOption,
	type QuestionAnswer,
	type QuestionId,
} from '../questions';
import type { DigestFormat } from '../workflows/dailyInboxDigest';

const props = defineProps<{
	questionId: QuestionId;
	/** The answer given before, so the card opens on it. */
	answer?: QuestionAnswer;
	canGoBack?: boolean;
	canGoForward?: boolean;
}>();

const isDigestFormat = (value: string): value is DigestFormat =>
	FORMAT_OPTIONS.some((option) => option.value === value);

const emit = defineEmits<{ answer: [answer: QuestionAnswer]; back: []; forward: [] }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const index = computed(() => QUESTION_IDS.indexOf(props.questionId));
const isLast = computed(() => index.value === QUESTION_IDS.length - 1);

// Each question starts on its recommended choice, so Next is always available.
const previous = props.answer;
const format = ref(previous?.id === 'format' ? previous.value : FORMAT_OPTIONS[0].value);
const provider = ref(previous?.id === 'provider' ? previous.value : PROVIDER_OPTIONS[0].value);
const destination = ref(
	previous?.id === 'destination' ? previous.value : DESTINATION_OPTIONS[0].value,
);

const previousTime = previous?.id === 'schedule' ? previous : undefined;
const isPresetTime = (hour: number, minute: number) =>
	SCHEDULE_TIMES.some((preset) => preset.hour === hour && preset.minute === minute);

const time = ref<{ hour: number; minute: number }>(
	previousTime && isPresetTime(previousTime.hour, previousTime.minute)
		? { hour: previousTime.hour, minute: previousTime.minute }
		: { ...DEFAULT_SCHEDULE_TIME },
);
const isCustomTime = ref(
	previousTime !== undefined && !isPresetTime(previousTime.hour, previousTime.minute),
);
const customTime = ref(
	isCustomTime.value && previousTime
		? `${String(previousTime.hour).padStart(2, '0')}:${String(previousTime.minute).padStart(2, '0')}`
		: '',
);
const weekdaysOnly = ref(previousTime?.weekdaysOnly ?? false);

const title = computed(() => {
	switch (props.questionId) {
		case 'format':
			return i18n.baseText('experiments.forceFirstWorkflow.format.title');
		case 'schedule':
			return i18n.baseText('experiments.forceFirstWorkflow.schedule.title');
		case 'provider':
			return i18n.baseText('experiments.forceFirstWorkflow.provider.title');
		case 'destination':
			return i18n.baseText('experiments.forceFirstWorkflow.destination.title');
	}
});

const options = computed<ReadonlyArray<ChoiceOption<string>> | undefined>(() => {
	switch (props.questionId) {
		case 'format':
			return FORMAT_OPTIONS;
		case 'provider':
			return PROVIDER_OPTIONS;
		case 'destination':
			return DESTINATION_OPTIONS;
		default:
			return undefined;
	}
});

const selectedValue = computed(() => {
	switch (props.questionId) {
		case 'format':
			return format.value;
		case 'provider':
			return provider.value;
		case 'destination':
			return destination.value;
		default:
			return undefined;
	}
});

const isNextEnabled = computed(
	() =>
		props.questionId !== 'schedule' ||
		!isCustomTime.value ||
		parseTimeInput(customTime.value) !== undefined,
);

function isTimeSelected(hour: number, minute: number) {
	return !isCustomTime.value && time.value.hour === hour && time.value.minute === minute;
}

function selectTime(hour: number, minute: number) {
	isCustomTime.value = false;
	time.value = { hour, minute };
}

function selectCustomTime() {
	isCustomTime.value = true;
}

function select(value: string) {
	switch (props.questionId) {
		case 'format':
			format.value = FORMAT_OPTIONS.find((option) => option.value === value)?.value ?? format.value;
			return;
		case 'provider':
			provider.value =
				PROVIDER_OPTIONS.find((option) => option.value === value)?.value ?? provider.value;
			return;
		case 'destination':
			destination.value =
				DESTINATION_OPTIONS.find((option) => option.value === value)?.value ?? destination.value;
			return;
	}
}

function next() {
	switch (props.questionId) {
		case 'format':
			emit('answer', { id: 'format', value: format.value });
			return;
		case 'schedule': {
			const picked = isCustomTime.value ? parseTimeInput(customTime.value) : time.value;
			if (!picked) return;
			emit('answer', {
				id: 'schedule',
				hour: picked.hour,
				minute: picked.minute,
				weekdaysOnly: weekdaysOnly.value,
			});
			return;
		}
		case 'provider':
			emit('answer', { id: 'provider', value: provider.value });
			return;
		case 'destination':
			emit('answer', { id: 'destination', value: destination.value });
			return;
	}
}
</script>

<template>
	<section :class="$style.card" data-test-id="first-workflow-question">
		<header :class="$style.header">
			<div :class="$style.navigation">
				<button
					type="button"
					:class="$style.arrow"
					:disabled="!canGoBack"
					:aria-label="i18n.baseText('experiments.forceFirstWorkflow.question.previous')"
					data-test-id="first-workflow-previous"
					@click="emit('back')"
				>
					<N8nIcon icon="chevron-left" size="small" />
				</button>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('experiments.forceFirstWorkflow.question.progress', {
							interpolate: { current: String(index + 1), total: String(QUESTION_IDS.length) },
						})
					}}
				</N8nText>
				<button
					type="button"
					:class="$style.arrow"
					:disabled="!canGoForward"
					:aria-label="i18n.baseText('experiments.forceFirstWorkflow.question.following')"
					data-test-id="first-workflow-following"
					@click="emit('forward')"
				>
					<N8nIcon icon="chevron-right" size="small" />
				</button>
			</div>
			<div :class="$style.progress" aria-hidden="true">
				<span
					v-for="(id, position) in QUESTION_IDS"
					:key="id"
					:class="[$style.segment, position <= index && $style.segmentDone]"
				/>
			</div>
		</header>

		<N8nText tag="h2" size="large" bold :class="$style.title">{{ title }}</N8nText>

		<div v-if="options" :class="$style.rows" role="radiogroup" :aria-label="title">
			<button
				v-for="option in options"
				:key="option.value"
				type="button"
				role="radio"
				:aria-checked="selectedValue === option.value"
				:class="[$style.row, selectedValue === option.value && $style.rowSelected]"
				:data-test-id="`first-workflow-option-${option.value}`"
				@click="select(option.value)"
			>
				<FirstWorkflowFormatPreview
					v-if="questionId === 'format' && isDigestFormat(option.value)"
					:format="option.value"
				/>
				<span v-else-if="option.nodeTypeName" :class="$style.iconTile" aria-hidden="true">
					<NodeIcon :node-type="nodeTypesStore.getNodeType(option.nodeTypeName)" :size="28" />
				</span>
				<span v-else-if="option.icon" :class="$style.iconTile" aria-hidden="true">
					<N8nIcon :icon="option.icon" size="large" />
				</span>
				<span :class="$style.rowText">
					<span :class="$style.rowLabel">
						<N8nText bold>{{ i18n.baseText(option.labelKey) }}</N8nText>
						<span v-if="option.badge" :class="$style.badge">
							{{
								i18n.baseText(
									option.badge === 'popular'
										? 'experiments.forceFirstWorkflow.badge.popular'
										: 'experiments.forceFirstWorkflow.badge.recommended',
								)
							}}
						</span>
					</span>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText(option.descriptionKey) }}
					</N8nText>
				</span>
				<span :class="$style.radio" aria-hidden="true">
					<span v-if="selectedValue === option.value" :class="$style.radioDot" />
				</span>
			</button>
		</div>

		<div v-else :class="$style.schedule">
			<div :class="$style.pills" role="radiogroup">
				<button
					v-for="option in SCHEDULE_TIMES"
					:key="`${option.hour}:${option.minute}`"
					type="button"
					role="radio"
					:aria-checked="isTimeSelected(option.hour, option.minute)"
					:class="[$style.pill, isTimeSelected(option.hour, option.minute) && $style.pillSelected]"
					:data-test-id="`first-workflow-time-${option.hour}-${option.minute}`"
					@click="selectTime(option.hour, option.minute)"
				>
					{{ formatTime(option.hour, option.minute) }}
				</button>
				<button
					type="button"
					role="radio"
					:aria-checked="isCustomTime"
					:class="[$style.pill, isCustomTime && $style.pillSelected]"
					data-test-id="first-workflow-time-custom"
					@click="selectCustomTime"
				>
					{{ i18n.baseText('experiments.forceFirstWorkflow.schedule.custom') }}
				</button>
			</div>

			<input
				v-if="isCustomTime"
				v-model="customTime"
				type="time"
				:class="$style.timeInput"
				:aria-label="i18n.baseText('experiments.forceFirstWorkflow.schedule.custom')"
				data-test-id="first-workflow-custom-time-input"
			/>

			<N8nText size="small" bold>
				{{ i18n.baseText('experiments.forceFirstWorkflow.schedule.repeat') }}
			</N8nText>
			<div :class="$style.pills" role="radiogroup">
				<button
					v-for="option in [false, true]"
					:key="String(option)"
					type="button"
					role="radio"
					:aria-checked="weekdaysOnly === option"
					:class="[$style.pill, weekdaysOnly === option && $style.pillSelected]"
					:data-test-id="`first-workflow-repeat-${option ? 'weekdays' : 'every-day'}`"
					@click="weekdaysOnly = option"
				>
					{{
						i18n.baseText(
							option
								? 'experiments.forceFirstWorkflow.schedule.weekdays'
								: 'experiments.forceFirstWorkflow.schedule.everyDay',
						)
					}}
				</button>
			</div>
		</div>

		<N8nButton
			size="large"
			:disabled="!isNextEnabled"
			:class="$style.next"
			:label="
				i18n.baseText(
					isLast
						? 'experiments.forceFirstWorkflow.question.continue'
						: 'experiments.forceFirstWorkflow.question.next',
				)
			"
			data-test-id="first-workflow-next"
			data-attr="first-workflow-next"
			@click="next"
		/>
	</section>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.navigation {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.arrow {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	cursor: pointer;
	color: var(--color--text);
	background: none;
	border: 0;
	border-radius: var(--radius);
}

.arrow:hover:not(:disabled) {
	background: var(--color--background--light-1);
}

.arrow:disabled {
	cursor: default;
	opacity: 0.4;
}

.progress {
	display: flex;
	gap: var(--spacing--4xs);
}

.segment {
	width: var(--spacing--md);
	height: var(--spacing--4xs);
	border-radius: var(--radius--full);
	background: var(--color--foreground);
}

.segmentDone {
	background: var(--color--text--shade-1);
}

.title {
	margin: 0;
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--2xs);
	text-align: left;
	cursor: pointer;
	color: var(--color--text--shade-1);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.row:hover {
	background: var(--color--background--light-1);
}

.rowSelected {
	border-color: var(--color--text--shade-1);
}

.iconTile {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	background: var(--color--background--light-1);
	border-radius: var(--radius);
}

.rowText {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	gap: var(--spacing--5xs);
}

.rowLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.radio {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border: 2px solid var(--color--foreground--shade-1);
	border-radius: var(--radius--full);
}

.rowSelected .radio {
	border-color: var(--color--text--shade-1);
}

.radioDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--color--text--shade-1);
}

.badge {
	flex-shrink: 0;
	padding: 0 var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--danger);
	background: var(--color--danger--tint-4);
	border-radius: var(--radius);
}

.schedule {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.pills {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.pill {
	padding: var(--spacing--2xs) var(--spacing--sm);
	cursor: pointer;
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--full);
}

.pill:hover {
	background: var(--color--background--light-1);
}

.pillSelected,
.pillSelected:hover {
	color: var(--color--text--tint-3);
	background: var(--color--text--shade-1);
	border-color: var(--color--text--shade-1);
}

.timeInput {
	align-self: flex-start;
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);
}

.next {
	width: 100%;
	border-radius: var(--radius--full);
}
</style>
