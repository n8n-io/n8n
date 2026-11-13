<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { SkillCatalogItem, SkillTrialPreview, SkillTrialResult } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nInput,
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

const props = defineProps<{ item: SkillCatalogItem; projectId: string }>();
const emit = defineEmits<{ close: []; save: [] }>();
const i18n = useI18n();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const preview = ref<SkillTrialPreview>();
const result = ref<SkillTrialResult>();
const loading = ref(true);
const running = ref(false);
const error = ref('');
const model = ref('');
const credential = ref<string | null>(null);
const message = ref(i18n.baseText('agents.skillTrial.example'));
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
const canRun = computed(
	() =>
		!!preview.value &&
		!!model.value &&
		!!credential.value &&
		!!message.value.trim() &&
		!loading.value,
);

function onModelChange(selection: AgentModelSelection) {
	const selectedCredential = effectiveCredentials.value?.[selection.provider] ?? null;
	model.value = `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`;
	credential.value = selectedCredential;
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
	} catch (cause) {
		error.value = getErrorMessage(cause);
	} finally {
		loading.value = false;
	}
}

async function run() {
	if (!canRun.value || running.value || !preview.value || !credential.value) return;
	running.value = true;
	error.value = '';
	result.value = undefined;
	try {
		result.value = await runSkillTrial(rootStore.restApiContext, props.projectId, {
			catalogId: props.item.id,
			contentHash: preview.value.contentHash,
			message: message.value,
			model: model.value,
			credential: credential.value,
		});
	} catch (cause) {
		error.value = getErrorMessage(cause);
	} finally {
		running.value = false;
	}
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
		:busy="running"
		:trap-focus="!credentialModalOpen"
		:cancel-label="i18n.baseText('generic.close')"
		data-test-id="skill-trial-dialog"
		@update:open="emit('close')"
	>
		<div :class="$style.content">
			<N8nText color="text-light">{{ i18n.baseText('agents.skillTrial.description') }}</N8nText>
			<N8nText v-if="loading" role="status">{{
				i18n.baseText('agents.skillTrial.loading')
			}}</N8nText>
			<template v-if="preview">
				<N8nText>{{ preview.skill.description }}</N8nText>
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
					<N8nCallout theme="warning">
						<ul :class="$style.findings">
							<li v-for="(finding, index) in preview.check.findings" :key="index">
								{{ finding.detail }}
							</li>
						</ul>
					</N8nCallout>
				</details>
				<div :class="$style.field">
					<N8nText bold>{{ i18n.baseText('agents.skillTrial.model') }}</N8nText>
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
				</div>
				<div :class="$style.field">
					<label for="skill-trial-prompt">{{ i18n.baseText('agents.skillTrial.prompt') }}</label>
					<N8nInput
						id="skill-trial-prompt"
						v-model="message"
						type="textarea"
						:rows="4"
						:maxlength="10000"
						:disabled="running"
						data-test-id="skill-trial-prompt"
					/>
				</div>
			</template>
			<N8nCallout v-if="error" theme="danger" role="alert" data-test-id="skill-trial-error">
				{{ error }}
				<N8nButton v-if="!preview" variant="outline" @click="prepare">{{
					i18n.baseText('generic.retry')
				}}</N8nButton>
			</N8nCallout>
			<N8nText v-if="running" role="status">{{
				i18n.baseText('agents.skillTrial.running')
			}}</N8nText>
			<section
				v-if="result"
				:class="$style.result"
				aria-live="polite"
				data-test-id="skill-trial-result"
			>
				<div :class="$style.metadata">
					<N8nBadge>{{
						result.skillLoaded
							? i18n.baseText('agents.skillTrial.loaded')
							: i18n.baseText('agents.skillTrial.notLoaded')
					}}</N8nBadge>
					<N8nText size="small" color="text-light"
						>{{ result.model }} · {{ (result.durationMs / 1000).toFixed(1) }}s</N8nText
					>
				</div>
				<N8nMarkdown :content="result.response" />
			</section>
		</div>
		<template #footerBeforeCancel>
			<N8nButton
				variant="ghost"
				:disabled="running || loading"
				data-attr="skill-trial-save"
				@click="emit('save')"
				>{{ i18n.baseText('settings.context.skills.catalog.save') }}</N8nButton
			>
		</template>
		<template #footerActions>
			<N8nButton
				:disabled="!canRun"
				:loading="running"
				data-test-id="skill-trial-run"
				data-attr="skill-trial-run"
				@click="run"
				>{{ i18n.baseText('agents.skillTrial.run') }}</N8nButton
			>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	overflow-wrap: anywhere;
}
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.findings {
	margin: 0;
	padding-inline-start: var(--spacing--md);
}
.result {
	border-top: var(--border);
	padding-top: var(--spacing--md);
}
.metadata {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
}
</style>
