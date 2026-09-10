<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { TIME } from '@/app/constants';
import type { AgentChannelViewProps } from '../types';
import { isOpenAiCompatibleChannelRuntime } from './useOpenAiCompatibleChannelRuntime';

const props = defineProps<AgentChannelViewProps>();

const i18n = useI18n();
const copied = shallowRef(false);

const runtime = computed(() => {
	if (!isOpenAiCompatibleChannelRuntime(props.runtime)) {
		throw new Error(
			'AgentChannelOpenAiCompatibleEditView requires an OpenAiCompatibleChannelRuntime',
		);
	}
	return props.runtime;
});

const revealedKey = computed(() => runtime.value.apiKey.value);

async function copyValue(value: string) {
	await navigator.clipboard.writeText(value);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2 * TIME.SECOND);
}

async function handleRegenerate() {
	await runtime.value.regenerate();
}

function selectInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) event.target.select();
}

const currentSettings = computed(() => undefined);
const validationError = computed(() => null);

defineExpose({ currentSettings, validationError });
</script>

<template>
	<div :class="$style.editView">
		<div :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.channels.openaiCompatible.baseUrl.label') }}
			</N8nText>
			<N8nInput
				:model-value="runtime.baseUrl.value"
				size="large"
				readonly
				data-testid="openai-compatible-base-url"
				@focus="selectInput"
			>
				<template #suffix>
					<N8nIconButton
						icon="copy"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('generic.copy')"
						data-testid="openai-compatible-copy-base-url"
						@click.stop="copyValue(runtime.baseUrl.value)"
					/>
				</template>
			</N8nInput>
		</div>

		<div v-if="revealedKey" :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.channels.openaiCompatible.apiKey.label') }}
			</N8nText>
			<N8nInput
				:model-value="revealedKey"
				size="large"
				readonly
				data-testid="openai-compatible-api-key"
				@focus="selectInput"
			>
				<template #suffix>
					<N8nIconButton
						:icon="copied ? 'check' : 'copy'"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('generic.copy')"
						data-testid="openai-compatible-copy-key"
						@click.stop="copyValue(revealedKey)"
					/>
				</template>
			</N8nInput>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.channels.openaiCompatible.apiKey.hint') }}
			</N8nText>
		</div>
		<N8nText v-else size="small" color="text-light">
			{{ i18n.baseText('agents.channels.openaiCompatible.apiKey.masked') }}
		</N8nText>

		<N8nButton
			variant="subtle"
			size="medium"
			:loading="loading"
			data-testid="openai-compatible-regenerate-button"
			@click="handleRegenerate"
		>
			{{ i18n.baseText('agents.channels.openaiCompatible.regenerate.button') }}
		</N8nButton>

		<N8nText v-if="errorMessage" size="small" :class="$style.errorText">
			{{ errorMessage }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.errorText {
	color: var(--color--danger);
}
</style>
