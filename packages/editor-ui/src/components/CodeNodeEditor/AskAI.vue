<script setup lang="ts">
import { N8nButton, N8nInput } from 'n8n-design-system/components';
import { ref, defineEmits } from 'vue';
import { useDataSchema } from '@/composables';
import { generateCodeForPrompt } from '@/api/ai';
import { useRootStore } from '@/stores';

const emit = defineEmits<{
	submit: (code: string) => void;
}>();
const { getWorkflowSchema } = useDataSchema();
const maxLength = 600;
const prompt = ref('');

async function onSubmit() {
	const schema = getWorkflowSchema();
	try {
		const { getRestApiContext } = useRootStore();
		const { code } = await generateCodeForPrompt(getRestApiContext, {
			prompt: prompt.value,
			schema,
		});

		emit('replaceCode', code);
	} catch (error) {
		console.log('Failed to generate code', error);
	}
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
			<N8nButton :disabled="!prompt" @click="onSubmit">{{
				$locale.baseText('codeNodeEditor.askAi.generateCode')
			}}</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.input * {
	border: 0 !important;
}
.input textarea {
	padding-bottom: var(--spacing-l);
}
.intro {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-dark);
	padding: var(--spacing-2xs) var(--spacing-xs) 0;
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
	right: var(--spacing-xs);
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
