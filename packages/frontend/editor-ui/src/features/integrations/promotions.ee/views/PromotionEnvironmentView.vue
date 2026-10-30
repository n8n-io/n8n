<script setup lang="ts">
import {
	isPromotionGitHostType,
	promotionProviderTypeSchema,
	type PromotionDirection,
	type PromotionProviderType,
	type PromotionRepository,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCheckbox,
	N8nFormInput,
	N8nIcon,
	N8nLoading2,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useEventListener } from '@vueuse/core';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { MODAL_CONFIRM } from '@/app/constants';
import PromotionGitHostSelect from '../components/PromotionGitHostSelect.vue';
import PromotionProviderDialog from '../components/PromotionProviderDialog.vue';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import { PROMOTIONS_SETTINGS_VIEW } from '../promotions.constants';
import {
	createPromotionEnvironment,
	deleteProviderIfUnused,
	fetchPromotionEnvironment,
	fetchPromotionEnvironments,
	updatePromotionEnvironment,
	type PromotionEnvironment,
	type PromotionEnvironmentSummary,
} from '../promotionsSettings.api';
import {
	promotionEnvironmentBranch,
	promotionEnvironmentDirectionFields,
	promotionProviderIcon,
	type PromotionProviderChange,
} from '../promotionsSettings.utils';

const props = defineProps<{
	direction?: PromotionDirection;
	environmentId?: string;
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();
const { canConnect, connect } = usePromotionCheckout();

const overview = { name: PROMOTIONS_SETTINGS_VIEW };

const isLoading = ref(true);
const step = ref<'provider' | 'settings'>(props.environmentId ? 'settings' : 'provider');
const loaded = ref<PromotionEnvironment>();
const otherEnvironment = ref<PromotionEnvironmentSummary>();
const pickedType = ref<PromotionProviderType>();
const sharedProvider = ref<PromotionEnvironment['provider']>();
const createdProviderId = ref<string>();
const dialogOpen = ref(false);
const discoveryRevision = ref(0);
const isSaving = ref(false);
let isSaved = false;

const form = reactive<{
	name: string;
	remoteUrl: string;
	repositoryPath?: string;
	branch: string;
	createBranchOnPromotion: boolean;
}>({
	name: '',
	remoteUrl: '',
	branch: 'main',
	createBranchOnPromotion: false,
});

const direction = computed(() => loaded.value?.direction ?? props.direction);
const pageTitle = computed(() =>
	loaded.value
		? i18n.baseText('settings.promotions.environment.edit.title', {
				interpolate: { name: loaded.value.name },
			})
		: i18n.baseText('settings.promotions.environments.add'),
);
watch(pageTitle, (title) => documentTitle.set(title), { immediate: true });
const providerId = computed(() => sharedProvider.value?.id ?? createdProviderId.value);
const providerType = computed(() => sharedProvider.value?.type ?? pickedType.value);
const hasHostApi = computed(
	() => !!providerType.value && isPromotionGitHostType(providerType.value),
);
const createBranchLabelKey = computed(() =>
	hasHostApi.value
		? 'settings.promotions.environment.form.createBranch.gitlab'
		: 'settings.promotions.environment.form.createBranch.git',
);
const needsRepositorySelection = computed(
	() => hasHostApi.value && !!form.remoteUrl && !form.repositoryPath,
);
const canSave = computed(
	() =>
		!!form.name.trim() &&
		!!form.remoteUrl.trim() &&
		!!form.branch.trim() &&
		!(hasHostApi.value && !form.repositoryPath),
);

onMounted(async () => {
	const context = rootStore.publicApiContext;
	try {
		if (props.environmentId) {
			const environment = await fetchPromotionEnvironment(context, props.environmentId);
			loaded.value = environment;
			sharedProvider.value = environment.provider;
			Object.assign(form, {
				name: environment.name,
				remoteUrl: environment.remote.remoteUrl,
				repositoryPath: environment.remote.repositoryPath,
				branch: promotionEnvironmentBranch(environment),
				createBranchOnPromotion:
					environment.direction === 'promote' && environment.settings.createBranchOnPromotion,
			});
		} else {
			const environments = await fetchPromotionEnvironments(context, { scope: 'instance' });
			if (environments.some((environment) => environment.direction === props.direction)) {
				await router.replace(overview);
				return;
			}
			otherEnvironment.value = environments[0];
		}
		isLoading.value = false;
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText(
				props.environmentId
					? 'settings.promotions.environment.toast.error.load'
					: 'settings.promotions.environments.error.title',
			),
		);
		await router.replace(overview);
	}
});

function showSettings() {
	step.value = 'settings';
}

function pickType(type: PromotionProviderType) {
	pickedType.value = type;
	const other = otherEnvironment.value;
	if (other?.provider.type !== type) {
		dialogOpen.value = true;
		return;
	}
	sharedProvider.value = other.provider;
	if (!isPromotionGitHostType(type)) form.remoteUrl = other.remote.remoteUrl;
	showSettings();
}

function onProviderSaved(change: PromotionProviderChange) {
	if (!loaded.value) {
		createdProviderId.value = change.id;
		return;
	}
	// The API derives the URL on the new host from the stored repository path.
	if (change.hostChanged) {
		form.remoteUrl = loaded.value.remote.remoteUrl;
		form.repositoryPath = loaded.value.remote.repositoryPath;
	}
	if (change.hostChanged || change.credentialsChanged) discoveryRevision.value++;
}

function onDialogOpenChange(open: boolean) {
	dialogOpen.value = open;
	if (!open && step.value === 'provider' && createdProviderId.value) showSettings();
}

function selectRepository(repository: PromotionRepository) {
	const isSameRepository =
		repository.fullPath === form.repositoryPath || repository.remoteUrl === form.remoteUrl;
	form.remoteUrl = repository.remoteUrl;
	form.repositoryPath = repository.fullPath;
	if (!isSameRepository) form.branch = repository.defaultBranch ?? '';
}

// The API closes the open reviews of a Promote environment on the old repository. Git host paths
// ignore case.
const changesReviewRepository = (current: PromotionEnvironment) =>
	current.direction === 'promote' &&
	hasHostApi.value &&
	form.repositoryPath?.toLowerCase() !== current.remote.repositoryPath?.toLowerCase();

async function confirmRepositoryChange(name: string) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.promotions.environment.changeRepository.confirm.message', {
			interpolate: { name },
		}),
		i18n.baseText('settings.promotions.environment.changeRepository.confirm.title'),
		{
			confirmButtonText: i18n.baseText(
				'settings.promotions.environment.changeRepository.confirm.button',
			),
			cancelButtonText: i18n.baseText('generic.cancel'),
			customClass: 'el-message-box--destructive',
			showClose: true,
		},
	);
	return confirmed === MODAL_CONFIRM;
}

async function save() {
	const selectedProviderId = providerId.value;
	const selectedDirection = direction.value;
	if (!canSave.value || isSaving.value || !selectedProviderId || !selectedDirection) return;
	const context = rootStore.publicApiContext;
	const name = form.name.trim();
	const remote = { schemaVersion: 1 as const, remoteUrl: form.remoteUrl.trim() };
	const current = loaded.value;
	if (
		current &&
		changesReviewRepository(current) &&
		!(await confirmRepositoryChange(current.name))
	) {
		return;
	}
	const directionFields = promotionEnvironmentDirectionFields(
		selectedDirection,
		form.branch.trim(),
		form.createBranchOnPromotion,
	);
	let saved: PromotionEnvironment;
	let connected = true;
	isSaving.value = true;
	try {
		if (current) {
			const remoteChanged =
				remote.remoteUrl !== current.remote.remoteUrl ||
				form.repositoryPath !== current.remote.repositoryPath;
			saved = await updatePromotionEnvironment(context, current.id, {
				name,
				settings: directionFields.settings,
				...(remoteChanged && { remote }),
			});
		} else {
			saved = await createPromotionEnvironment(context, {
				name,
				scope: 'instance',
				providerId: selectedProviderId,
				remote,
				...directionFields,
			});
		}
		isSaved = true;
		invalidateInstancePromotionConnection();
		if (canConnect.value && !saved.checkout.matchesEnvironment) connected = await connect(saved.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.environment.toast.error.save'));
		return;
	} finally {
		isSaving.value = false;
	}
	if (connected) {
		toast.showMessage({
			title: i18n.baseText(
				current
					? 'settings.promotions.environment.toast.saved'
					: 'settings.promotions.environment.toast.added',
				{ interpolate: { name: saved.name } },
			),
			type: 'success',
		});
	}
	await router.replace(overview);
}

// Route guards do not run on reload or tab close.
useEventListener(window, 'beforeunload', (event) => {
	if (createdProviderId.value && !isSaved) event.preventDefault();
});

onBeforeRouteLeave(() => {
	if (isSaving.value) return false;
	if (createdProviderId.value && !isSaved) {
		void deleteProviderIfUnused(rootStore.publicApiContext, createdProviderId.value).catch(
			(error: unknown) =>
				toast.showError(error, i18n.baseText('settings.promotions.provider.toast.error.delete')),
		);
	}
	return true;
});
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		show-back
		:back-label="i18n.baseText('settings.promotions.environment.back')"
		@back="router.push(overview)"
	>
		<N8nSettingsPageHeader
			:title="pageTitle"
			:description="
				direction ? i18n.baseText(`settings.promotions.environment.${direction}.description`) : ''
			"
			:show-docs-link="false"
		/>

		<N8nLoading2 v-if="isLoading" :rows="3" :shrink-last="false" />

		<N8nSettingsSection
			v-else-if="step === 'provider'"
			:title="i18n.baseText('settings.promotions.environment.provider.title')"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="type in promotionProviderTypeSchema.options"
					:key="type"
					clickable
					:title="i18n.baseText(`settings.promotions.providers.type.${type}`)"
					:description="
						i18n.baseText(`settings.promotions.environment.provider.${type}.description`)
					"
					:data-test-id="`promotion-provider-type-${type}`"
					@click="pickType(type)"
				>
					<template #visual>
						<N8nIcon :icon="promotionProviderIcon[type]" color="text-dark" size="xlarge" />
					</template>
					<template #action>
						<N8nIcon icon="chevron-right" color="text-light" size="small" />
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
			<div :class="$style.footer">
				<N8nButton variant="outline" @click="router.push(overview)">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
			</div>
		</N8nSettingsSection>

		<N8nSettingsSection
			v-else
			:title="i18n.baseText('settings.promotions.environment.settings.title')"
		>
			<form :class="$style.settings" @submit.prevent="save">
				<N8nSettingsRowGroup>
					<N8nSettingsRow layout="custom">
						<div :class="$style.fields">
							<N8nFormInput
								v-model="form.name"
								name="promotion-environment-name"
								:label="i18n.baseText('settings.promotions.environment.form.name')"
								required
								:show-required-asterisk="false"
								:focus-initially="!loaded"
								:disabled="isSaving"
								data-test-id="promotion-environment-name-input"
								@enter="save"
							/>

							<N8nFormInput
								v-if="sharedProvider"
								:model-value="sharedProvider.id"
								:label="i18n.baseText('settings.promotions.environment.form.provider')"
								:info-text="
									i18n.baseText(
										loaded
											? 'settings.promotions.environment.form.provider.locked'
											: 'settings.promotions.environment.form.provider.reused',
									)
								"
							>
								<div :class="$style.provider">
									<div :class="$style.providerValue" data-test-id="promotion-environment-provider">
										<N8nIcon :icon="promotionProviderIcon[sharedProvider.type]" color="text-dark" />
										<N8nText color="text-dark">
											{{
												i18n.baseText('settings.promotions.environment.form.provider.value', {
													interpolate: {
														type: i18n.baseText(
															`settings.promotions.providers.type.${sharedProvider.type}`,
														),
														name: sharedProvider.name,
													},
												})
											}}
										</N8nText>
									</div>
									<N8nButton
										v-if="loaded"
										type="button"
										variant="outline"
										:disabled="isSaving"
										data-test-id="promotion-environment-edit-credentials"
										@click="dialogOpen = true"
									>
										{{ i18n.baseText('settings.promotions.environment.editProvider') }}
									</N8nButton>
								</div>
							</N8nFormInput>

							<N8nFormInput
								v-if="hasHostApi && providerId"
								:model-value="form.remoteUrl"
								name="promotion-environment-repository"
								:label="i18n.baseText('settings.promotions.discovery.repository.label')"
								required
								:show-required-asterisk="false"
								:info-text="
									needsRepositorySelection
										? i18n.baseText('settings.promotions.discovery.repository.selectAgain')
										: undefined
								"
							>
								<PromotionGitHostSelect
									:model-value="form.remoteUrl"
									:selected-label="form.repositoryPath"
									kind="repository"
									input-id="promotion-environment-repository"
									:provider-id="providerId"
									:revision="discoveryRevision"
									:disabled="isSaving"
									data-test-id="promotion-environment-repository-select"
									@selected="selectRepository"
								/>
							</N8nFormInput>
							<N8nFormInput
								v-else
								v-model="form.remoteUrl"
								name="promotion-environment-remote-url"
								:label="i18n.baseText('settings.promotions.environment.form.remoteUrl')"
								:info-text="i18n.baseText('settings.promotions.environment.form.remoteUrl.hint')"
								required
								:show-required-asterisk="false"
								:disabled="isSaving"
								data-test-id="promotion-environment-remote-url-input"
								@enter="save"
							/>

							<N8nFormInput
								v-if="hasHostApi && providerId"
								:model-value="form.branch"
								name="promotion-environment-branch"
								:label="i18n.baseText('settings.promotions.environment.form.branch')"
								required
								:show-required-asterisk="false"
							>
								<PromotionGitHostSelect
									v-model="form.branch"
									kind="branch"
									input-id="promotion-environment-branch"
									:provider-id="providerId"
									:repository-id="form.repositoryPath"
									:revision="discoveryRevision"
									:disabled="isSaving"
									data-test-id="promotion-environment-branch-select"
								/>
							</N8nFormInput>
							<N8nFormInput
								v-else
								v-model="form.branch"
								name="promotion-environment-branch"
								:label="i18n.baseText('settings.promotions.environment.form.branch')"
								required
								:show-required-asterisk="false"
								:disabled="isSaving"
								data-test-id="promotion-environment-branch-input"
								@enter="save"
							/>

							<N8nCheckbox
								v-if="direction === 'promote'"
								v-model="form.createBranchOnPromotion"
								:disabled="isSaving"
								data-test-id="promotion-environment-create-branch"
							>
								<template #label>
									{{ i18n.baseText(createBranchLabelKey) }}
									<N8nText :class="$style.hint" size="small" color="text-light">
										{{ i18n.baseText(`${createBranchLabelKey}.description`) }}
									</N8nText>
								</template>
							</N8nCheckbox>
						</div>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>

				<div :class="$style.footer">
					<N8nButton
						type="button"
						variant="outline"
						:disabled="isSaving"
						data-test-id="promotion-environment-cancel"
						@click="router.push(overview)"
					>
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						type="submit"
						:disabled="!canSave"
						:loading="isSaving"
						data-test-id="promotion-environment-save"
					>
						{{ i18n.baseText(loaded ? 'generic.save' : 'settings.promotions.environments.add') }}
					</N8nButton>
				</div>
			</form>
		</N8nSettingsSection>

		<PromotionProviderDialog
			v-if="dialogOpen"
			:open="dialogOpen"
			:type="pickedType"
			:provider-id="loaded ? providerId : undefined"
			@update:open="onDialogOpenChange"
			@saved="onProviderSaved"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.layout {
	padding-top: 0;
}

/* Pin the back action to the top-left of the settings area so the heading lines up with the overview. */
.layout > div:first-child {
	position: absolute;
	top: var(--spacing--lg);
	left: var(--spacing--lg);
	width: auto;
}

.settings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.provider {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.providerValue {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--lg);
	padding-inline: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--disabled);
}

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
	line-height: var(--line-height--md);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
