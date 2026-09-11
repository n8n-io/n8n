<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { N8nButton, N8nIconButton, N8nInput, N8nStepper, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { TIME } from '@/app/constants';
import type { AgentChannelViewProps } from '../types';
import { isOpenAiCompatibleChannelRuntime } from './useOpenAiCompatibleChannelRuntime';

const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	connected: [];
	generated: [connectionId: string];
	cancel: [];
}>();

const i18n = useI18n();
const copiedField = shallowRef<'baseUrl' | 'apiKey' | 'yaml' | null>(null);
const generateError = ref<string | null>(null);

const runtime = computed(() => {
	if (!isOpenAiCompatibleChannelRuntime(props.runtime)) {
		throw new Error('AgentChannelOpenAiCompatibleSetup requires an OpenAiCompatibleChannelRuntime');
	}
	return props.runtime;
});

// Key generation runs through the runtime (not the modal's connect), so the
// modal's `loading` prop stays false while it is pending. Fold the runtime's
// own loading in so every action here — and, through `defineExpose`, the modal
// itself — treats the flow as in flight.
const busy = computed(() => props.loading || runtime.value.loading.value);
const displayError = computed(() => generateError.value ?? (props.errorMessage || ''));

const revealedKey = computed(() => runtime.value.apiKey.value);
const isLibrechat = computed(() => props.integration.type === 'librechat');
const librechatYaml = computed(
	() => `endpoints:
  custom:
    - name: "${props.integration.label}"
      apiKey: "${revealedKey.value ?? '${N8N_AGENT_API_KEY}'}"
      baseURL: "${runtime.value.baseUrl.value}"
      models:
        default: ["${props.agentId}"]
        fetch: true`,
);
const instructions = computed(() =>
	i18n.baseText(
		props.integration.type === 'librechat'
			? 'agents.channels.openaiCompatible.instructions.librechat'
			: 'agents.channels.openaiCompatible.instructions.openwebui',
	),
);

const steps = computed(() => [
	{
		id: 'generate',
		title: i18n.baseText('agents.channels.openaiCompatible.setup.generate.title'),
		description: i18n.baseText('agents.channels.openaiCompatible.setup.generate.description'),
	},
	{
		id: 'configure',
		title: i18n.baseText('agents.channels.openaiCompatible.setup.configure.title', {
			interpolate: { platform: props.integration.label },
		}),
		description: instructions.value,
	},
	{
		id: 'confirm',
		title: i18n.baseText('agents.channels.openaiCompatible.setup.confirm.title'),
		description: i18n.baseText('agents.channels.openaiCompatible.setup.confirm.description'),
	},
]);

function valueFor(field: 'baseUrl' | 'apiKey' | 'yaml'): string {
	if (field === 'yaml') return librechatYaml.value;
	return field === 'baseUrl' ? runtime.value.baseUrl.value : (revealedKey.value ?? '');
}

async function copyValue(field: 'baseUrl' | 'apiKey' | 'yaml') {
	await navigator.clipboard.writeText(valueFor(field));
	copiedField.value = field;
	setTimeout(() => {
		if (copiedField.value === field) {
			copiedField.value = null;
		}
	}, 2 * TIME.SECOND);
}

function copyLabel(field: 'baseUrl' | 'apiKey' | 'yaml'): string {
	return copiedField.value === field
		? i18n.baseText('agents.builder.addTrigger.copied')
		: i18n.baseText('agents.builder.addTrigger.copy');
}

async function handleGenerate() {
	generateError.value = null;
	try {
		await runtime.value.connect();
	} catch {
		// The runtime path has no shared error surface, so report inline and leave
		// the button active for a retry.
		generateError.value = i18n.baseText('agents.channels.openaiCompatible.generate.error');
		return;
	}
	const connectionId = runtime.value.connectionId.value;
	if (connectionId) {
		emit('generated', connectionId);
	}
}

function handleConfirm() {
	emit('connected');
}

function handleCancel() {
	emit('cancel');
}

function selectInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) event.target.select();
}

const currentSettings = computed(() => undefined);
const validationError = computed(() => null);

defineExpose({ currentSettings, validationError, loading: busy });
</script>

<template>
	<div :class="$style.openAiCompatibleSetup">
		<!--
			`connected` can already be true here if this view remounts on an
			agent that was connected in an earlier session (this runtime
			instance's own `apiKey` ref starts empty either way, since the key
			is never re-fetched). Mirrors AgentChannelLinearSetup's `!connected`
			guard: don't re-prompt "Generate" on an already-connected channel.
		-->
		<N8nText v-if="connected && !revealedKey" size="small">
			{{ connectedDescription || i18n.baseText('agents.channels.openaiCompatible.apiKey.masked') }}
		</N8nText>

		<N8nStepper v-else :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<template v-if="step.id === 'generate'">
						<N8nButton
							v-if="!revealedKey"
							variant="subtle"
							size="medium"
							:loading="busy"
							data-testid="openai-compatible-connect-button"
							@click="handleGenerate"
						>
							{{ i18n.baseText('agents.channels.openaiCompatible.setup.generate.button') }}
						</N8nButton>
						<N8nText
							v-else
							size="small"
							color="text-light"
							data-testid="openai-compatible-generated"
						>
							{{ i18n.baseText('agents.channels.openaiCompatible.setup.generate.done') }}
						</N8nText>
					</template>

					<template v-else-if="step.id === 'configure'">
						<div :class="$style.field">
							<N8nText size="small" bold>
								{{ i18n.baseText('agents.channels.openaiCompatible.baseUrl.label') }}
							</N8nText>
							<N8nInput
								:model-value="runtime.baseUrl.value"
								size="large"
								readonly
								:class="$style.urlInput"
								data-testid="openai-compatible-base-url"
								@focus="selectInput"
							>
								<template #suffix>
									<N8nIconButton
										:icon="copiedField === 'baseUrl' ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:class="$style.copyButton"
										:title="copyLabel('baseUrl')"
										:aria-label="copyLabel('baseUrl')"
										data-testid="openai-compatible-copy-base-url"
										@click.stop="copyValue('baseUrl')"
									/>
								</template>
							</N8nInput>
						</div>

						<div v-if="isLibrechat" :class="$style.field">
							<N8nText size="small" bold>
								{{ i18n.baseText('agents.channels.openaiCompatible.librechatYaml.label') }}
							</N8nText>
							<div :class="$style.codeBlock">
								<N8nIconButton
									:icon="copiedField === 'yaml' ? 'check' : 'copy'"
									variant="ghost"
									size="small"
									:class="$style.codeCopyButton"
									:title="copyLabel('yaml')"
									:aria-label="copyLabel('yaml')"
									data-testid="openai-compatible-copy-yaml"
									@click.stop="copyValue('yaml')"
								/>
								<pre :class="$style.codeContent"><code>{{ librechatYaml }}</code></pre>
							</div>
						</div>

						<div v-if="revealedKey" :class="$style.field">
							<N8nText size="small" bold>
								{{ i18n.baseText('agents.channels.openaiCompatible.apiKey.label') }}
							</N8nText>
							<N8nInput
								:model-value="revealedKey"
								size="large"
								readonly
								:class="$style.urlInput"
								data-testid="openai-compatible-api-key"
								@focus="selectInput"
							>
								<template #suffix>
									<N8nIconButton
										:icon="copiedField === 'apiKey' ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:class="$style.copyButton"
										:title="copyLabel('apiKey')"
										:aria-label="copyLabel('apiKey')"
										data-testid="openai-compatible-copy-key"
										@click.stop="copyValue('apiKey')"
									/>
								</template>
							</N8nInput>
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('agents.channels.openaiCompatible.apiKey.hint') }}
							</N8nText>
						</div>
						<N8nText v-else size="small" color="text-light">
							{{ i18n.baseText('agents.channels.openaiCompatible.setup.apiKey.pending') }}
						</N8nText>
					</template>

					<div v-else-if="step.id === 'confirm'" :class="$style.confirmStep">
						<N8nButton
							variant="solid"
							size="medium"
							:disabled="!revealedKey || busy"
							data-testid="openai-compatible-confirm-button"
							@click="handleConfirm"
						>
							{{ i18n.baseText('agents.channels.openaiCompatible.setup.confirm.button') }}
						</N8nButton>
						<N8nButton
							variant="outline"
							size="medium"
							:disabled="busy"
							data-testid="openai-compatible-cancel-button"
							@click="handleCancel"
						>
							{{ i18n.baseText('generic.cancel') }}
						</N8nButton>
					</div>
				</div>
			</template>
		</N8nStepper>

		<N8nText v-if="displayError" size="small" :class="$style.errorText">
			{{ displayError }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.openAiCompatibleSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.stepContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--xs);
	// Let the code block scroll instead of forcing the dialog wider than its
	// max-width (the long baseURL line has a large min-content width).
	min-width: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.confirmStep {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.urlInput {
	flex: 1;
	min-width: 0;
}

.urlInput input {
	font-family: monospace;
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
}

.copyButton {
	margin-right: calc(var(--spacing--3xs) * -1);
}

.codeBlock {
	position: relative;
	min-width: 0;
	max-width: 100%;
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
}

.codeCopyButton {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
}

.codeContent {
	margin: 0;
	// Leave room for the copy button so wrapped lines don't run under it.
	padding: var(--spacing--xs) var(--spacing--xl) var(--spacing--xs) var(--spacing--xs);
	font-family: monospace;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	// Wrap long lines (baseURL, key) instead of overflowing the dialog.
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.errorText {
	color: var(--color--danger);
}
</style>
