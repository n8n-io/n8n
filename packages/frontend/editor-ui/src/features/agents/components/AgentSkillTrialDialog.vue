<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
	SKILL_TRIAL_MAX_HISTORY_MESSAGES,
	SKILL_TRIAL_MAX_HISTORY_CHARACTERS,
	type SkillCatalogItem,
	type SkillTrialPreview,
	type SkillTrialMessage,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nChatInput,
	N8nChatMessage,
	N8nMarkdown,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useAgentModelCredentials } from '../composables/useAgentModelCredentials';
import { useModelCatalog } from '../composables/useModelCatalog';
import { prepareSkillTrial, runSkillTrial } from '../composables/useSkillTrialApi';
import {
	isAgentModelProvider,
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
} from '../model-providers';
import { parseModelString, sanitizeModelId } from '../utils/model-string';
import AgentModelSelector from './AgentModelSelector.vue';
import AgentModal from './modals/AgentModal.vue';
import AgentTypingIndicator from './AgentTypingIndicator.vue';

const props = defineProps<{ item: SkillCatalogItem; projectId: string }>();
const emit = defineEmits<{ close: []; save: [] }>();
const i18n = useI18n();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const preview = ref<SkillTrialPreview>();
const messages = ref<SkillTrialMessage[]>([]);
const pendingMessage = ref('');
const detailsOpen = ref(false);
const transcript = useTemplateRef<HTMLElement>('transcript');
const composer = useTemplateRef<InstanceType<typeof N8nChatInput>>('composer');
const loading = ref(true);
const running = ref(false);
const error = ref('');
const model = ref('');
const credential = ref<string | null>(null);
const message = ref('');
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();
const { credentialsByProvider, selectCredential } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
	() => props.projectId,
);
const credentialModalOpen = computed(
	() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true,
);
const effectiveCredentials = computed(() => {
	const base = credentialsByProvider.value;
	const parsed = parseModelString(model.value);
	return base && parsed && isAgentModelProvider(parsed.provider) && credential.value
		? { ...base, [parsed.provider]: credential.value }
		: base;
});
const modelsByProvider = computed(() => getModelsForPicker(effectiveCredentials.value));
const selectedModel = computed<AgentModelOption | null>(() => {
	const parsed = parseModelString(model.value);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return null;
	return (
		modelsByProvider.value[parsed.provider]?.models.find((item) => item.model === parsed.name) ?? {
			provider: parsed.provider,
			model: parsed.name,
			name: parsed.name,
			description: null,
			createdAt: null,
			metadata: { functionCalling: true, available: true },
		}
	);
});
const chatFull = computed(
	() =>
		messages.value.length >= SKILL_TRIAL_MAX_HISTORY_MESSAGES ||
		messages.value.reduce((length, entry) => length + entry.content.length, 0) >
			SKILL_TRIAL_MAX_HISTORY_CHARACTERS,
);
const canSend = computed(
	() =>
		!!preview.value &&
		!!model.value &&
		!!credential.value &&
		!loading.value &&
		!running.value &&
		!chatFull.value,
);

watch([() => messages.value.length, pendingMessage, error], async () => {
	await nextTick();
	if (transcript.value) transcript.value.scrollTop = transcript.value.scrollHeight;
});

function onModelChange(selection: AgentModelSelection) {
	const selectedCredential = effectiveCredentials.value?.[selection.provider] ?? null;
	model.value = `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`;
	credential.value = selectedCredential;
	if (selectedCredential) {
		detailsOpen.value = false;
		void nextTick(() => composer.value?.focusInput());
	}
}

function onCredentialChange(provider: AgentModelProvider, id: string | null) {
	selectCredential(provider, id);
	if (parseModelString(model.value)?.provider === provider) credential.value = id;
}

async function prepare() {
	loading.value = true;
	error.value = '';
	try {
		preview.value = await prepareSkillTrial(
			rootStore.restApiContext,
			props.projectId,
			props.item.id,
		);
		model.value = preview.value.defaultModel?.model ?? '';
		credential.value = preview.value.defaultModel?.credential ?? null;
		detailsOpen.value = !model.value || !credential.value;
	} catch (cause) {
		error.value = getErrorMessage(cause);
	} finally {
		loading.value = false;
		await nextTick();
		composer.value?.focusInput();
	}
}

async function send() {
	if (!canSend.value || !message.value.trim() || !preview.value || !credential.value) return;
	const outgoing = message.value.trim();
	running.value = true;
	error.value = '';
	pendingMessage.value = outgoing;
	message.value = '';
	detailsOpen.value = false;
	try {
		const result = await runSkillTrial(rootStore.restApiContext, props.projectId, {
			catalogId: props.item.id,
			contentHash: preview.value.contentHash,
			message: outgoing,
			history: messages.value.map((entry) => ({ ...entry })),
			model: model.value,
			credential: credential.value,
		});
		messages.value.push(
			{ role: 'user', content: outgoing },
			{ role: 'assistant', content: result.response },
		);
	} catch (cause) {
		error.value = getErrorMessage(cause);
		message.value = outgoing;
	} finally {
		pendingMessage.value = '';
		running.value = false;
		await nextTick();
		composer.value?.focusInput();
	}
}

function newChat() {
	if (running.value) return;
	messages.value = [];
	message.value = '';
	error.value = '';
	detailsOpen.value = false;
	void nextTick(() => composer.value?.focusInput());
}

onMounted(() => {
	void ensureLoaded(props.projectId);
	void prepare();
});
</script>

<template>
	<AgentModal
		:open="true"
		:title="i18n.baseText('agents.skillTrial.title', { interpolate: { name: item.name } })"
		:busy="running || credentialModalOpen"
		:trap-focus="!credentialModalOpen"
		:show-footer="false"
		:body-scrollable="false"
		body-flush
		stable-height
		data-test-id="skill-trial-dialog"
		@update:open="emit('close')"
	>
		<div :class="$style.chat">
			<div :class="$style.toolbar">
				<N8nBadge v-if="preview">{{ i18n.baseText('agents.skillTrial.attached') }}</N8nBadge>
				<N8nText v-else size="small" color="text-light">{{
					i18n.baseText('agents.skillTrial.loading')
				}}</N8nText>
				<div :class="$style.actions">
					<N8nButton
						v-if="messages.length"
						variant="ghost"
						size="small"
						:disabled="running"
						data-attr="skill-trial-new-chat"
						@click="newChat"
						>{{ i18n.baseText('agents.skillTrial.newChat') }}</N8nButton
					>
					<N8nButton
						v-if="preview"
						variant="ghost"
						size="small"
						:aria-expanded="detailsOpen"
						data-attr="skill-trial-details"
						@click="detailsOpen = !detailsOpen"
						>{{ i18n.baseText('agents.skillTrial.details') }}</N8nButton
					>
				</div>
			</div>
			<div v-if="detailsOpen && preview" :class="$style.details">
				<N8nText>{{ preview.skill.description }}</N8nText>
				<AgentModelSelector
					:selected-model="selectedModel"
					:credentials="effectiveCredentials"
					:models-by-provider="modelsByProvider"
					:is-loading="isLoading"
					:project-id="projectId"
					:bound-credential-id="credential"
					:disabled="running"
					credential-modal-append-to-body
					warn-missing-credentials
					@change="onModelChange"
					@select-credential="onCredentialChange"
				/>
				<N8nText v-if="!model || !credential" color="text-light" size="small">{{
					i18n.baseText('agents.skillTrial.chooseModel')
				}}</N8nText>
				<details>
					<summary>{{ i18n.baseText('agents.skillTrial.instructions') }}</summary>
					<N8nMarkdown :content="preview.skill.instructions" />
				</details>
				<details v-if="preview.check.findings.length">
					<summary>
						{{
							i18n.baseText('agents.skillTrial.contentNotes', {
								interpolate: { count: preview.check.findings.length },
							})
						}}
					</summary>
					<N8nCallout theme="warning"
						><ul :class="$style.findings">
							<li v-for="(finding, index) in preview.check.findings" :key="index">
								{{ finding.detail }}
							</li>
						</ul></N8nCallout
					>
				</details>
				<N8nButton
					variant="ghost"
					:disabled="running"
					data-attr="skill-trial-save"
					@click="emit('save')"
					>{{ i18n.baseText('settings.context.skills.catalog.save') }}</N8nButton
				>
			</div>
			<div
				v-show="!detailsOpen"
				ref="transcript"
				:class="$style.transcript"
				role="log"
				:aria-label="i18n.baseText('agents.skillTrial.conversation')"
				aria-live="polite"
				data-test-id="skill-trial-conversation"
			>
				<div v-if="preview && !messages.length && !pendingMessage && !error" :class="$style.empty">
					<N8nText size="large" bold>{{ i18n.baseText('agents.skillTrial.empty') }}</N8nText>
					<N8nText color="text-light">{{
						i18n.baseText('agents.skillTrial.emptyHint', { interpolate: { name: item.name } })
					}}</N8nText>
				</div>
				<N8nChatMessage
					v-for="(entry, index) in messages"
					:key="index"
					:role="entry.role"
					:data-test-id="`skill-trial-${entry.role}-message`"
				>
					<N8nMarkdown v-if="entry.role === 'assistant'" :content="entry.content" />
					<template v-else>{{ entry.content }}</template>
				</N8nChatMessage>
				<template v-if="pendingMessage">
					<N8nChatMessage role="user" data-test-id="skill-trial-pending-message">{{
						pendingMessage
					}}</N8nChatMessage>
					<N8nChatMessage role="assistant"
						><span role="status" :aria-label="i18n.baseText('agents.skillTrial.running')"
							><AgentTypingIndicator /></span
					></N8nChatMessage>
				</template>
				<N8nCallout v-if="error" theme="danger" role="alert" data-test-id="skill-trial-error">
					{{ error }}
					<N8nButton variant="outline" :disabled="running" @click="preview ? send() : prepare()">{{
						i18n.baseText('generic.retry')
					}}</N8nButton>
				</N8nCallout>
				<N8nText v-if="chatFull" color="text-light">{{
					i18n.baseText('agents.skillTrial.chatFull')
				}}</N8nText>
			</div>
			<div :class="$style.composer">
				<N8nChatInput
					ref="composer"
					v-model="message"
					:placeholder="
						i18n.baseText('agents.skillTrial.prompt', { interpolate: { name: item.name } })
					"
					:max-length="10000"
					:max-lines-before-scroll="4"
					:disabled="loading || running || !preview || chatFull"
					:submit-disabled="!canSend || !message.trim()"
					input-test-id="skill-trial-prompt"
					send-button-test-id="skill-trial-send"
					data-attr="skill-trial-composer"
					layout="multiline"
					refocus-after-send
					@submit="send"
				/>
				<div :class="$style.composerFooter">
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="loading || running"
						data-attr="skill-trial-model"
						@click="detailsOpen = !detailsOpen"
						>{{ selectedModel?.name || i18n.baseText('agents.skillTrial.model') }}</N8nButton
					>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('agents.skillTrial.description')
					}}</N8nText>
				</div>
			</div>
		</div>
	</AgentModal>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/mixins' as scrollbar-mixins;

.chat {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow-wrap: anywhere;
}
.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding-inline: var(--spacing--lg);
	padding-bottom: var(--spacing--xs);
	flex-shrink: 0;
}
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
.transcript,
.details {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--sm) var(--spacing--lg);
	scrollbar-gutter: stable;
	@include scrollbar-mixins.scroll-bar;
}
.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	height: 100%;
	gap: var(--spacing--xs);
}
.composer {
	padding: var(--spacing--sm) var(--spacing--lg) var(--spacing--xs);
	flex-shrink: 0;
}
.composerFooter {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--3xs);
}
.findings {
	margin: 0;
	padding-inline-start: var(--spacing--md);
}
</style>
