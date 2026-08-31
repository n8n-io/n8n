<script setup lang="ts">
/**
 * "Mock this tool" section for a node-tool config (AGENT-716). Lets a builder
 * enable pin-data-style mocking so Preview can exercise the agent without a
 * real credential: toggling on with no stored items generates+persists a mock
 * immediately (billing/generation lives server-side, see
 * `agent-tool-mock.service.ts`); toggling off, editing items, and Regenerate
 * are otherwise local draft edits applied through the tool modal's normal Save.
 */
import { computed, ref, watch } from 'vue';
import { MAX_TOOL_MOCK_ITEMS_SIZE, NodeToolMockConfigSchema } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nSpinner, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentJsonConfig, AgentJsonNodeToolMockConfig } from '../types';
import { generateAgentToolMockData } from '../composables/useAgentApi';
import AgentMiniEditor from './AgentMiniEditor.vue';

const props = defineProps<{
	mock?: AgentJsonNodeToolMockConfig;
	toolName: string;
	serviceLabel: string;
	projectId?: string;
	agentId?: string;
}>();

const emit = defineEmits<{
	'update:mock': [mock: AgentJsonNodeToolMockConfig | undefined];
	'update:valid': [valid: boolean];
	/** Fired after a persisted generate/regenerate call, so the host can sync its store immediately. */
	generated: [config: AgentJsonConfig];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

function itemsToText(items: AgentJsonNodeToolMockConfig['items'] | undefined): string {
	return JSON.stringify(items ?? [], null, 2);
}

const itemsText = ref(itemsToText(props.mock?.items));
const validationError = ref('');
const generationError = ref('');
const isGenerating = ref(false);
const fallbackUsed = ref(false);
// Keeps the switch on while a first-time generate is in flight — the persisted
// `mock.enabled` only flips once generation succeeds, and a toggle that doesn't
// move until then reads as broken. Reverts on failure.
const pendingEnable = ref(false);
let lastAppliedItemsJson = JSON.stringify(props.mock?.items ?? []);

const isEnabled = computed(() => (props.mock?.enabled ?? false) || pendingEnable.value);
const canGenerate = computed(() => Boolean(props.projectId && props.agentId));
const itemsByteSize = computed(() => new TextEncoder().encode(itemsText.value).length);
const isOversized = computed(() => itemsByteSize.value > MAX_TOOL_MOCK_ITEMS_SIZE);

watch(
	() => props.mock?.items,
	(items) => {
		const incoming = JSON.stringify(items ?? []);
		if (incoming === lastAppliedItemsJson) return;
		lastAppliedItemsJson = incoming;
		itemsText.value = itemsToText(items);
		validationError.value = '';
	},
);

watch(validationError, (error) => emit('update:valid', !error));

/** Parses + validates the draft text against the shared schema; returns the parsed items on success. */
function validateItemsText(): AgentJsonNodeToolMockConfig['items'] | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(itemsText.value);
	} catch {
		validationError.value = i18n.baseText('agents.builder.toolMock.error.invalidJson');
		return null;
	}

	// Checked ahead of the schema's own size refinement so the message names the
	// specific problem — all other schema failures collapse to one generic copy
	// below, since the schema's own messages aren't localized.
	if (new TextEncoder().encode(JSON.stringify(parsed)).length > MAX_TOOL_MOCK_ITEMS_SIZE) {
		validationError.value = i18n.baseText('agents.builder.toolMock.error.tooLarge', {
			interpolate: { max: String(Math.floor(MAX_TOOL_MOCK_ITEMS_SIZE / 1024)) },
		});
		return null;
	}

	const result = NodeToolMockConfigSchema.safeParse({
		...props.mock,
		enabled: true,
		items: parsed,
	});
	if (!result.success) {
		validationError.value = i18n.baseText('agents.builder.toolMock.error.invalid');
		return null;
	}

	validationError.value = '';
	return result.data.items;
}

function onItemsTextChange(next: string) {
	itemsText.value = next;
	const items = validateItemsText();
	if (!items) return;
	lastAppliedItemsJson = JSON.stringify(items);
	emit('update:mock', { ...props.mock, enabled: true, items });
}

async function generate() {
	if (!props.projectId || !props.agentId) {
		generationError.value = i18n.baseText('agents.builder.toolMock.error.unsavedAgent');
		return;
	}

	isGenerating.value = true;
	generationError.value = '';
	try {
		const result = await generateAgentToolMockData(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			{ toolName: props.toolName, source: 'user' },
		);
		lastAppliedItemsJson = JSON.stringify(result.mock.items);
		itemsText.value = itemsToText(result.mock.items);
		validationError.value = '';
		fallbackUsed.value = result.fallbackUsed;
		emit('update:mock', result.mock);
		emit('generated', result.config);
	} catch (error) {
		generationError.value =
			error instanceof Error
				? error.message
				: i18n.baseText('agents.builder.toolMock.error.generate');
	} finally {
		isGenerating.value = false;
	}
}

async function onToggle(next: boolean) {
	generationError.value = '';
	if (!next) {
		if (props.mock) emit('update:mock', { ...props.mock, enabled: false });
		return;
	}

	// Re-enabling with items already stored is a free local edit — regenerating
	// is a deliberate, separate action (the "Regenerate" button).
	if (props.mock?.items?.length) {
		emit('update:mock', { ...props.mock, enabled: true });
		return;
	}

	pendingEnable.value = true;
	try {
		await generate();
	} finally {
		pendingEnable.value = false;
	}
}
</script>

<template>
	<div :class="$style.section" data-test-id="agent-tool-mock-section">
		<div :class="$style.header">
			<div :class="$style.text">
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('agents.builder.toolMock.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('agents.builder.toolMock.explainer', {
							interpolate: { service: serviceLabel },
						})
					}}
				</N8nText>
			</div>
			<N8nSwitch2
				:model-value="isEnabled"
				:disabled="(!canGenerate && !isEnabled) || isGenerating"
				data-test-id="agent-tool-mock-toggle"
				@update:model-value="onToggle"
			/>
		</div>

		<N8nText v-if="!canGenerate" size="small" color="text-light">
			{{ i18n.baseText('agents.builder.toolMock.error.unsavedAgent') }}
		</N8nText>

		<!--
			Generation can fail before there is anything stored to enable, so this
			stays outside the `isEnabled` body below — otherwise a failed first
			generate would leave the toggle off with no visible error at all.
		-->
		<N8nText
			v-if="generationError"
			size="small"
			color="danger"
			data-test-id="agent-tool-mock-generate-error"
		>
			{{ generationError }}
		</N8nText>

		<div v-if="isEnabled" :class="$style.body">
			<div v-if="isGenerating" :class="$style.loading" data-test-id="agent-tool-mock-generating">
				<N8nSpinner size="small" />
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.toolMock.generating') }}
				</N8nText>
			</div>
			<template v-else>
				<N8nCallout
					v-if="fallbackUsed"
					theme="warning"
					data-test-id="agent-tool-mock-fallback-notice"
				>
					{{ i18n.baseText('agents.builder.toolMock.fallbackNotice') }}
				</N8nCallout>
				<AgentMiniEditor
					language="json"
					:model-value="itemsText"
					min-height="120px"
					max-height="260px"
					data-test-id="agent-tool-mock-items-editor"
					@update:model-value="onItemsTextChange"
				/>
				<N8nText
					size="small"
					:color="isOversized ? 'danger' : 'text-light'"
					data-test-id="agent-tool-mock-size"
				>
					{{
						i18n.baseText('agents.builder.toolMock.size', {
							interpolate: {
								size: String(Math.ceil(itemsByteSize / 1024)),
								max: String(Math.floor(MAX_TOOL_MOCK_ITEMS_SIZE / 1024)),
							},
						})
					}}
				</N8nText>
				<N8nText
					v-if="validationError"
					size="small"
					color="danger"
					data-test-id="agent-tool-mock-error"
				>
					{{ validationError }}
				</N8nText>
				<div :class="$style.actions">
					<N8nButton
						variant="subtle"
						size="small"
						:disabled="isGenerating || !canGenerate"
						data-test-id="agent-tool-mock-regenerate"
						@click="generate"
					>
						{{ i18n.baseText('agents.builder.toolMock.regenerate') }}
					</N8nButton>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.loading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
}
</style>
