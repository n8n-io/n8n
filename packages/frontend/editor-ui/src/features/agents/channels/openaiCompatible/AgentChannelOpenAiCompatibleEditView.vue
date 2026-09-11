<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { TIME } from '@/app/constants';
import type { AgentChannelViewProps } from '../types';
import { isOpenAiCompatibleChannelRuntime } from './useOpenAiCompatibleChannelRuntime';

const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	// Emitted after a successful key rotation so the modal re-reads the refreshed
	// integration status (the old connection id is dead after regenerate).
	regenerated: [];
}>();

const i18n = useI18n();
const copiedField = shallowRef<'baseUrl' | 'apiKey' | null>(null);
const regenerateError = ref<string | null>(null);

const runtime = computed(() => {
	if (!isOpenAiCompatibleChannelRuntime(props.runtime)) {
		throw new Error(
			'AgentChannelOpenAiCompatibleEditView requires an OpenAiCompatibleChannelRuntime',
		);
	}
	return props.runtime;
});

const revealedKey = computed(() => runtime.value.apiKey.value);
// Regeneration runs through the runtime, not the modal's connect, so the modal's
// `loading` prop stays false. Fold the runtime's own loading in so this view and
// (through `defineExpose`) the modal both treat the rotation as in flight.
const busy = computed(() => props.loading || runtime.value.loading.value);
const displayError = computed(() => regenerateError.value ?? (props.errorMessage || ''));

async function copyValue(field: 'baseUrl' | 'apiKey', value: string) {
	await navigator.clipboard.writeText(value);
	copiedField.value = field;
	setTimeout(() => {
		if (copiedField.value === field) {
			copiedField.value = null;
		}
	}, 2 * TIME.SECOND);
}

function copyLabel(field: 'baseUrl' | 'apiKey'): string {
	return copiedField.value === field
		? i18n.baseText('agents.builder.addTrigger.copied')
		: i18n.baseText('agents.builder.addTrigger.copy');
}

async function handleRegenerate() {
	if (busy.value) return;
	regenerateError.value = null;
	try {
		await runtime.value.regenerate();
	} catch {
		// The runtime path has no shared error surface, so report inline and leave
		// the button active for a retry.
		regenerateError.value = i18n.baseText('agents.channels.openaiCompatible.regenerate.error');
		return;
	}
	emit('regenerated');
}

function selectInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) event.target.select();
}

const currentSettings = computed(() => undefined);
const validationError = computed(() => null);

defineExpose({ currentSettings, validationError, loading: busy });
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
						:icon="copiedField === 'baseUrl' ? 'check' : 'copy'"
						variant="ghost"
						size="small"
						:title="copyLabel('baseUrl')"
						:aria-label="copyLabel('baseUrl')"
						data-testid="openai-compatible-copy-base-url"
						@click.stop="copyValue('baseUrl', runtime.baseUrl.value)"
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
						:icon="copiedField === 'apiKey' ? 'check' : 'copy'"
						variant="ghost"
						size="small"
						:title="copyLabel('apiKey')"
						:aria-label="copyLabel('apiKey')"
						data-testid="openai-compatible-copy-key"
						@click.stop="copyValue('apiKey', revealedKey)"
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
			:loading="busy"
			data-testid="openai-compatible-regenerate-button"
			@click="handleRegenerate"
		>
			{{ i18n.baseText('agents.channels.openaiCompatible.regenerate.button') }}
		</N8nButton>

		<N8nText v-if="displayError" size="small" :class="$style.errorText">
			{{ displayError }}
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
