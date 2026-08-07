<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiConfiguration } from '../composables/useInstanceAiConfiguration';
import {
	INSTANCE_AI_MODEL_PROVIDERS,
	INSTANCE_AI_SEARCH_PROVIDERS,
} from '../instanceAiConnection.constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import InstanceAiOnboardingIntro from './InstanceAiOnboardingIntro.vue';
import InstanceAiOnboardingWizard from './InstanceAiOnboardingWizard.vue';
import { useInstanceAiOnboarding, type InstanceAiOnboardingStep } from './useInstanceAiOnboarding';

const emit = defineEmits<{ completed: [] }>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const message = useMessage();
const store = useInstanceAiSettingsStore();
const credentialsStore = useCredentialsStore();
const configuration = useInstanceAiConfiguration();

const sandboxEnvConfigured = computed(() => store.settings?.sandboxEnvConfigured === true);
const searchEnvConfigured = computed(() => store.settings?.searchEnvConfigured === true);
const searchDecided = computed(() => configuration.searchState.value !== 'notset');
const onboarding = useInstanceAiOnboarding({
	modelConfigured: configuration.modelConfigured,
	sandboxConfigured: configuration.sandboxConfigured,
	searchDecided,
	searchEnvConfigured,
});

const notSet = computed(() => i18n.baseText('instanceAi.onboarding.notSet'));
const modelValue = computed(() => {
	if (!configuration.modelConfigured.value) return notSet.value;
	if (store.settings?.modelEnvConfigured) {
		return i18n.baseText('instanceAi.onboarding.foundOnServer');
	}
	const provider = INSTANCE_AI_MODEL_PROVIDERS.find(
		({ credentialType, id }) =>
			id !== 'custom' && credentialType === configuration.modelCredential.value?.type,
	)?.id;
	return provider && store.settings?.modelName
		? `${provider}/${store.settings.modelName}`
		: (store.settings?.modelName ?? notSet.value);
});
const sandboxValue = computed(() => {
	if (sandboxEnvConfigured.value) {
		return i18n.baseText('instanceAi.onboarding.foundOnServer');
	}
	if (!configuration.sandboxConfigured.value) return notSet.value;
	return store.settings?.sandboxProvider === 'daytona' ? 'Daytona' : 'n8n Sandbox';
});
const searchValue = computed(() => {
	if (configuration.searchState.value === 'notset') return notSet.value;
	if (configuration.searchState.value === 'disabled') {
		return i18n.baseText('instanceAi.onboarding.disabled');
	}
	if (configuration.searchState.value === 'env') {
		return i18n.baseText('instanceAi.onboarding.foundOnServer');
	}
	const credentialType = configuration.searchCredential.value?.type;
	return (
		INSTANCE_AI_SEARCH_PROVIDERS.find(({ credentialType: type }) => type === credentialType)
			?.label ?? i18n.baseText('instanceAi.onboarding.search.label')
	);
});
const composeFastPath = computed(
	() => configuration.sandboxConfigured.value && searchEnvConfigured.value,
);
const incomplete = computed(() => configuration.hasSetupProgress.value && !composeFastPath.value);
function startAt(step?: Exclude<InstanceAiOnboardingStep, 'done'>): void {
	onboarding.start(step ?? onboarding.firstUnmetStep());
}

function editStep(step: Exclude<InstanceAiOnboardingStep, 'done'>): void {
	onboarding.start(step, true);
}

function handleWizardOpenChange(open: boolean): void {
	if (open) return;
	if (configuration.setupCompleted.value) {
		finish();
		return;
	}
	onboarding.close();
}

function finish(): void {
	if (!configuration.setupCompleted.value) {
		onboarding.close();
		return;
	}
	onboarding.close();
	emit('completed');
}

async function turnOff(): Promise<void> {
	const confirmed = await message.confirm(
		i18n.baseText('instanceAi.onboarding.turnOff.description'),
		{
			title: i18n.baseText('instanceAi.onboarding.turnOff.title'),
			confirmButtonText: i18n.baseText('instanceAi.onboarding.turnOff.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM || !(await store.persistEnabled(false, false))) return;
	toast.showMessage({
		title: i18n.baseText('instanceAi.onboarding.turnOff.toastTitle'),
		message: i18n.baseText('instanceAi.onboarding.turnOff.toastDescription'),
		type: 'success',
	});
	await router.push({ name: VIEWS.HOMEPAGE });
}

onMounted(async () => {
	await Promise.all([store.fetch(), credentialsStore.fetchCredentialTypes(false)]);
});
</script>

<template>
	<div :class="$style.container">
		<InstanceAiOnboardingIntro
			v-if="!store.isLoading"
			:incomplete="incomplete"
			:connect-model-only="composeFastPath"
			:model-value="modelValue"
			:sandbox-value="sandboxValue"
			:search-value="searchValue"
			@setup="startAt()"
			@open-step="editStep"
			@turn-off="turnOff"
		/>

		<InstanceAiOnboardingWizard
			:open="onboarding.open.value"
			:step="onboarding.step.value"
			:edit-mode="onboarding.editMode.value"
			:sequence="onboarding.sequence.value"
			:model-value="modelValue"
			:sandbox-value="sandboxValue"
			:search-value="searchValue"
			:compose-fast-path="composeFastPath"
			@update:open="handleWizardOpenChange"
			@advance="onboarding.advance"
			@back="onboarding.back"
			@edit="editStep"
			@completed="finish"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	width: 100%;
	height: 100%;
	min-width: 0;
}
</style>
