<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { TIME } from '@/app/constants';
import type { AgentChannelViewProps } from '../types';
import { isOpenAiCompatibleChannelRuntime } from './useOpenAiCompatibleChannelRuntime';

const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{ connected: [] }>();

const i18n = useI18n();
const copied = shallowRef(false);

const runtime = computed(() => {
	if (!isOpenAiCompatibleChannelRuntime(props.runtime)) {
		throw new Error('AgentChannelOpenAiCompatibleSetup requires an OpenAiCompatibleChannelRuntime');
	}
	return props.runtime;
});

const revealedKey = computed(() => runtime.value.apiKey.value);
const instructionsKey = computed(() =>
	props.integration.type === 'librechat'
		? 'agents.channels.openaiCompatible.instructions.librechat'
		: 'agents.channels.openaiCompatible.instructions.openwebui',
);

async function copyValue(value: string) {
	await navigator.clipboard.writeText(value);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2 * TIME.SECOND);
}

async function handleConnect() {
	await runtime.value.connect();
}

function handleDone() {
	emit('connected');
}

function selectInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) event.target.select();
}

const currentSettings = computed(() => undefined);
const validationError = computed(() => null);

defineExpose({ currentSettings, validationError });
</script>

<template>
	<div :class="$style.setup">
		<!--
			`connected` can already be true here if this view remounts on an
			agent that was connected in an earlier session (this runtime
			instance's own `apiKey` ref starts empty either way, since the key
			is never re-fetched). Mirrors AgentChannelLinearSetup's `!connected`
			guard: don't re-prompt "Connect" on an already-connected channel.
		-->
		<N8nText v-if="connected && !revealedKey" size="small">
			{{ connectedDescription || i18n.baseText('agents.channels.openaiCompatible.apiKey.masked') }}
		</N8nText>

		<template v-else-if="!revealedKey">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText(instructionsKey) }}
			</N8nText>
			<N8nButton
				variant="subtle"
				size="medium"
				:loading="loading"
				data-testid="openai-compatible-connect-button"
				@click="handleConnect"
			>
				{{ i18n.baseText('agents.channels.openaiCompatible.connect.button') }}
			</N8nButton>
		</template>

		<template v-else>
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
							:icon="copied ? 'check' : 'copy'"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('generic.copy')"
							data-testid="openai-compatible-copy-base-url"
							@click.stop="copyValue(runtime.baseUrl.value)"
						/>
					</template>
				</N8nInput>
			</div>
			<div :class="$style.field">
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
							@click.stop="copyValue(revealedKey ?? '')"
						/>
					</template>
				</N8nInput>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.channels.openaiCompatible.apiKey.hint') }}
				</N8nText>
			</div>
			<N8nButton
				variant="solid"
				size="medium"
				data-testid="openai-compatible-done-button"
				@click="handleDone"
			>
				{{ i18n.baseText('agents.channels.openaiCompatible.done.button') }}
			</N8nButton>
		</template>

		<N8nText v-if="errorMessage" size="small" :class="$style.errorText">
			{{ errorMessage }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.setup {
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
