<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useToast } from '@/composables/useToast';
import { useProvisioningStore } from '../provisioning.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import {
	N8nHeading,
	N8nText,
	N8nSpinner,
	N8nInput,
	N8nButton,
	N8nSelect,
	N8nOption,
} from '@n8n/design-system';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();
const provisioningStore = useProvisioningStore();
const settingsStore = useSettingsStore();
const router = useRouter();

// Check if provisioning feature is enabled
onMounted(async () => {
	if (!settingsStore.isEnterpriseFeatureEnabled.provisioning) {
		await router.push({ name: VIEWS.SETTINGS });
		return;
	}

	documentTitle.set(i18n.baseText('settings.provisioning.title'));

	loading.value = true;
	try {
		await provisioningStore.getProvisioningConfig();
		loadFormData();
	} catch (error) {
		showError(error, i18n.baseText('settings.provisioning.loadError'));
	} finally {
		loading.value = false;
	}
});

const loading = ref(false);
const saving = ref(false);

// Form data
const scopesName = ref('');
const scopesInstanceRoleClaimName = ref('');
const scopesProjectsRolesClaimName = ref('');
const scopesProvisionInstanceRole = ref(false);
const scopesProvisionProjectRoles = ref(false);
const scopesProvisioningFrequency = ref('');

// Frequency options
const frequencyOptions = [
	{ label: 'Never', value: 'never' },
	{ label: 'First Login', value: 'first_login' },
	{ label: 'Every Login', value: 'every_login' },
];

const isFormDirty = computed(() => {
	if (!provisioningStore.provisioningConfig) return false;

	return (
		scopesName.value !== provisioningStore.provisioningConfig.scopesName ||
		scopesInstanceRoleClaimName.value !==
			provisioningStore.provisioningConfig.scopesInstanceRoleClaimName ||
		scopesProjectsRolesClaimName.value !==
			provisioningStore.provisioningConfig.scopesProjectsRolesClaimName ||
		scopesProvisionInstanceRole.value !==
			provisioningStore.provisioningConfig.scopesProvisionInstanceRole ||
		scopesProvisionProjectRoles.value !==
			provisioningStore.provisioningConfig.scopesProvisionProjectRoles ||
		scopesProvisioningFrequency.value !==
			provisioningStore.provisioningConfig.scopesProvisioningFrequency
	);
});

const loadFormData = () => {
	if (provisioningStore.provisioningConfig) {
		scopesName.value = provisioningStore.provisioningConfig.scopesName || '';
		scopesInstanceRoleClaimName.value =
			provisioningStore.provisioningConfig.scopesInstanceRoleClaimName || '';
		scopesProjectsRolesClaimName.value =
			provisioningStore.provisioningConfig.scopesProjectsRolesClaimName || '';
		scopesProvisionInstanceRole.value =
			provisioningStore.provisioningConfig.scopesProvisionInstanceRole || false;
		scopesProvisionProjectRoles.value =
			provisioningStore.provisioningConfig.scopesProvisionProjectRoles || false;
		scopesProvisioningFrequency.value =
			provisioningStore.provisioningConfig.scopesProvisioningFrequency || 'never';
	}
};

const onSave = async () => {
	saving.value = true;
	try {
		const config = {
			scopesName: scopesName.value,
			scopesInstanceRoleClaimName: scopesInstanceRoleClaimName.value,
			scopesProjectsRolesClaimName: scopesProjectsRolesClaimName.value,
			scopesProvisionInstanceRole: scopesProvisionInstanceRole.value,
			scopesProvisionProjectRoles: scopesProvisionProjectRoles.value,
			scopesProvisioningFrequency: scopesProvisioningFrequency.value,
		};

		await provisioningStore.saveProvisioningConfig(config);
		await provisioningStore.getProvisioningConfig();
		loadFormData();

		// Show success message
		showMessage({
			title: i18n.baseText('settings.provisioning.saveSuccess'),
			message: i18n.baseText('settings.provisioning.saveSuccessMessage'),
			type: 'success',
			duration: 3000,
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.provisioning.saveError'));
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<div class="pb-2xl">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.provisioning.title') }}</N8nHeading>
		</div>

		<N8nText color="text-light">
			{{ i18n.baseText('settings.provisioning.description') }}
		</N8nText>

		<div v-if="loading" :class="$style.loading">
			<N8nSpinner size="large" />
		</div>

		<div v-else>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesProvisionInstanceRole') }}</label>
				<div :class="$style.switchContainer">
					<label :class="$style.switchLabel">
						<input v-model="scopesProvisionInstanceRole" type="checkbox" :class="$style.checkbox" />
						<span :class="$style.switchText">
							{{
								scopesProvisionInstanceRole
									? i18n.baseText('generic.yes')
									: i18n.baseText('generic.no')
							}}
						</span>
					</label>
				</div>
				<small>{{ i18n.baseText('settings.provisioning.scopesProvisionInstanceRole.help') }}</small>
			</div>

			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesProvisionProjectRoles') }}</label>
				<div :class="$style.switchContainer">
					<label :class="$style.switchLabel">
						<input v-model="scopesProvisionProjectRoles" type="checkbox" :class="$style.checkbox" />
						<span :class="$style.switchText">
							{{
								scopesProvisionProjectRoles
									? i18n.baseText('generic.yes')
									: i18n.baseText('generic.no')
							}}
						</span>
					</label>
				</div>
				<small>{{ i18n.baseText('settings.provisioning.scopesProvisionProjectRoles.help') }}</small>
			</div>

			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesProvisioningFrequency') }}</label>
				<N8nSelect
					v-model="scopesProvisioningFrequency"
					size="large"
					:placeholder="
						i18n.baseText('settings.provisioning.scopesProvisioningFrequency.placeholder')
					"
				>
					<N8nOption
						v-for="option in frequencyOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<small>{{ i18n.baseText('settings.provisioning.scopesProvisioningFrequency.help') }}</small>
			</div>

			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesName') }}</label>
				<N8nInput
					v-model="scopesName"
					type="text"
					size="large"
					:placeholder="i18n.baseText('settings.provisioning.scopesName.placeholder')"
				/>
				<small>{{ i18n.baseText('settings.provisioning.scopesName.help') }}</small>
			</div>

			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesInstanceRoleClaimName') }}</label>
				<N8nInput
					v-model="scopesInstanceRoleClaimName"
					type="text"
					size="large"
					:placeholder="
						i18n.baseText('settings.provisioning.scopesInstanceRoleClaimName.placeholder')
					"
				/>
				<small>{{ i18n.baseText('settings.provisioning.scopesInstanceRoleClaimName.help') }}</small>
			</div>

			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesProjectsRolesClaimName') }}</label>
				<N8nInput
					v-model="scopesProjectsRolesClaimName"
					type="text"
					size="large"
					:placeholder="
						i18n.baseText('settings.provisioning.scopesProjectsRolesClaimName.placeholder')
					"
				/>
				<small>{{
					i18n.baseText('settings.provisioning.scopesProjectsRolesClaimName.help')
				}}</small>
			</div>

			<div :class="$style.buttons">
				<N8nButton
					:disabled="!isFormDirty || saving"
					size="large"
					:loading="saving"
					@click="onSave"
				>
					{{ i18n.baseText('settings.provisioning.save') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--sm);
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--2xl);
}

.buttons {
	display: flex;
	justify-content: flex-start;
	padding: var(--spacing--2xl) 0 var(--spacing--2xs);

	button {
		margin: 0 var(--spacing--sm) 0 0;
	}
}

.group {
	padding: var(--spacing--xl) 0 0;

	> label {
		display: inline-block;
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--medium);
		padding: 0 0 var(--spacing--2xs);
	}

	small {
		display: block;
		padding: var(--spacing--2xs) 0 0;
		font-size: var(--font-size--2xs);
		color: var(--color--text);
	}
}

.switchContainer {
	margin: var(--spacing--xs) 0;
}

.switchLabel {
	display: flex;
	align-items: center;
	cursor: pointer;
}

.checkbox {
	margin-right: var(--spacing--xs);
	transform: scale(1.2);
}

.switchText {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
}
</style>
