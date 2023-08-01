<script setup lang="ts">
import { N8nButton, N8nInput, N8nTooltip } from 'n8n-design-system/components';
import { ref, defineEmits, computed } from 'vue';
import { useDataSchema, useI18n } from '@/composables';
import { generateCodeForPrompt } from '@/api/ai';
import { useNDVStore, usePostHog, useRootStore } from '@/stores';
import CircleLoader from './CircleLoader.vue';
import { ASK_AI_EXPERIMENT } from '@/constants';

const emit = defineEmits<{
	submit: (code: string) => void;
}>();
const { getWorkflowSchema, getSchemaForExecutionData } = useDataSchema();
const { i18n } = useI18n();
const maxLength = 600;
const loadingDurationMs = 10000;

const loadingPhraseIndex = ref(0);
const loaderProgress = ref(0);

const isLoading = ref(false);
const prompt = ref('');

const hasExecutionData = computed(() => (useNDVStore().ndvInputData || []).length > 0);
const loadingString = computed(() =>
	i18n.baseText(`codeNodeEditor.askAi.loadingPhrase${loadingPhraseIndex.value}`),
);
async function onSubmit() {
	startLoading();
	const schema = getWorkflowSchema();

	try {
		const { ndvInputData } = useNDVStore();
		const version = useRootStore().versionCli;
		const model =
			usePostHog().getVariant(ASK_AI_EXPERIMENT.name) === ASK_AI_EXPERIMENT.gpt4
				? 'gpt-4'
				: 'gpt-3.5-turbo-16k';

		const { getRestApiContext } = useRootStore();
		const { code } = await generateCodeForPrompt(getRestApiContext, {
			question: prompt.value,
			context: { schema },
			model,
			n8nVersion: version,
		});

		stopLoading();
		emit('replaceCode', { code });
	} catch (error) {
		console.log('Failed to generate code', error);
		stopLoading();
	}
}

function triggerLoadingPhraseChange() {
	let start: number | null = null;
	let lastPhraseChange = 0;

	const step = (timestamp: number) => {
		if (!start) start = timestamp;

		if (!lastPhraseChange || timestamp - lastPhraseChange >= 2000) {
			loadingPhraseIndex.value = Math.floor(Math.random() * 8);
			lastPhraseChange = timestamp;
		}

		if (!isLoading.value) return;

		window.requestAnimationFrame(step);
	};
	window.requestAnimationFrame(step);
}

function triggerLoaderProgressChange() {
	let start: number | null = null;

	const step = (timestamp: number) => {
		if (!start) start = timestamp;
		const elapsed = timestamp - start;

		loaderProgress.value = Math.min((elapsed / loadingDurationMs) * 100, 100);

		if (!isLoading.value) return;

		if (loaderProgress.value < 100) {
			window.requestAnimationFrame(step);
		}
	};
	window.requestAnimationFrame(step);
}

function startLoading() {
	loaderProgress.value = 0;
	isLoading.value = true;
	triggerLoadingPhraseChange();
	triggerLoaderProgressChange();
}

function stopLoading() {
	loaderProgress.value = 100;
	setTimeout(() => {
		isLoading.value = false;
	}, 200);
}
</script>

<template>
	<div>
		<p :class="$style.intro" v-text="$locale.baseText('codeNodeEditor.askAi.intro')" />
		<div :class="$style.inputContainer">
			<div :class="$style.meta">
				<span
					v-show="prompt.length > 1"
					:class="$style.counter"
					v-text="`${prompt.length} / ${maxLength}`"
				/>
				<n8n-tooltip placement="bottom">
					<template #content>
						<div>
							{{ $locale.baseText('settings.communityNodes.upToDate.tooltip') }}
						</div>
					</template>
					<span :class="$style.help"
						><n8n-icon icon="question-circle" color="text-light" size="large" />{{
							$locale.baseText('codeNodeEditor.askAi.help')
						}}
					</span>
				</n8n-tooltip>
			</div>
			<N8nInput
				v-model="prompt"
				:class="$style.input"
				type="textarea"
				:rows="7"
				:maxlength="maxLength"
				:placeholder="$locale.baseText('codeNodeEditor.askAi.placeholder')"
			/>
		</div>
		<div :class="$style.controls">
			<div :class="$style.loader" v-if="isLoading">
				<transition name="text-fade-in-out" mode="out-in">
					<div v-text="loadingString" :key="loadingPhraseIndex" />
				</transition>
				<CircleLoader :radius="8" :progress="loaderProgress" :stroke-width="3" />
			</div>
			<n8n-tooltip :disabled="hasExecutionData" v-else>
				<div>
					<N8nButton :disabled="!hasExecutionData || !prompt" @click="onSubmit">{{
						$locale.baseText('codeNodeEditor.askAi.generateCode')
					}}</N8nButton>
				</div>
				<template #content v-if="!hasExecutionData">
					<span v-text="$locale.baseText('codeNodeEditor.askAi.noInputData')" />
				</template>
			</n8n-tooltip>
		</div>
	</div>
</template>

<style scoped>
.text-fade-in-out-enter-active,
.text-fade-in-out-leave-active {
	transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
}
.text-fade-in-out-enter,
.text-fade-in-out-leave-to {
	opacity: 0;
	transform: translateX(10px);
}
.text-fade-in-out-enter-to,
.text-fade-in-out-leave {
	opacity: 1;
}
</style>

<style module lang="scss">
.input * {
	border: 0 !important;
}
.input textarea {
	padding-bottom: var(--spacing-2xl);
}
.intro {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	padding: var(--spacing-2xs) var(--spacing-xs) 0;
}
.loader {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}
.inputContainer {
	position: relative;
}
.help {
	text-decoration: underline;
	margin-left: auto;
}
.meta {
	display: flex;
	justify-content: space-between;
	position: absolute;
	bottom: var(--spacing-2xs);
	left: var(--spacing-xs);
	right: var(--spacing-m);
	z-index: 1;

	* {
		font-size: var(--font-size-2xs);
		line-height: 1;
	}
}
.counter {
	color: var(--color-text-light);
}
.controls {
	padding: var(--spacing-2xs) var(--spacing-xs);
	display: flex;
	justify-content: flex-end;
	border-top: 1px solid var(--color-foreground-dark);
}
</style>
