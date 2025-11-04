<script lang="ts" setup>
import { onMounted, ref, computed, reactive } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useProvisioningStore } from '../provisioning.store';
import { N8nHeading, N8nText, N8nSpinner, N8nInput, N8nButton } from '@n8n/design-system';
import { type ProvisioningConfig } from '@n8n/rest-api-client';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();
const provisioningStore = useProvisioningStore();

// Check if provisioning feature is enabled
onMounted(async () => {
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

// Form data (reactive object)
const form = reactive({
	scopesName: '',
	scopesInstanceRoleClaimName: '',
	scopesProjectsRolesClaimName: '',
	provisioningEnabled: false,
});

const isFormDirty = computed(() => {
	const config = provisioningStore.provisioningConfig;
	if (!config) return false;
	const formKeysThatMatchWithConfig: Array<keyof typeof form & keyof ProvisioningConfig> = [
		'scopesName',
		'scopesInstanceRoleClaimName',
		'scopesProjectsRolesClaimName',
	];
	const configChanged = formKeysThatMatchWithConfig.some((key) => form[key] !== config[key]);
	const provisioningEnabledChanged =
		form.provisioningEnabled !==
		(config.scopesProvisionInstanceRole && config.scopesProvisionProjectRoles);
	return configChanged || provisioningEnabledChanged;
});

const loadFormData = () => {
	const cfg = provisioningStore.provisioningConfig;
	if (!cfg) return;
	Object.assign(form, {
		scopesName: cfg.scopesName || '',
		scopesInstanceRoleClaimName: cfg.scopesInstanceRoleClaimName || '',
		scopesProjectsRolesClaimName: cfg.scopesProjectsRolesClaimName || '',
	});
	form.provisioningEnabled = cfg.scopesProvisionInstanceRole;
};

const onSave = async () => {
	saving.value = true;
	try {
		const { provisioningEnabled, ...dataToSave } = form;
		await provisioningStore.saveProvisioningConfig({
			...dataToSave,
			scopesProvisionInstanceRole: provisioningEnabled,
			scopesProvisionProjectRoles: provisioningEnabled,
		});
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
	<div :class="$style.container">
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
				<label for="provisioning-enabled">{{
					i18n.baseText('settings.provisioning.toggle')
				}}</label>
				<small>{{ i18n.baseText('settings.provisioning.toggle.help') }}</small>
				<input
					id="provisioning-enabled"
					v-model="form.provisioningEnabled"
					type="checkbox"
					:class="$style.checkbox"
				/>
			</div>

			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesName') }}</label>
				<N8nInput
					v-model="form.scopesName"
					type="text"
					size="large"
					:placeholder="i18n.baseText('settings.provisioning.scopesName.placeholder')"
				/>
				<small>{{ i18n.baseText('settings.provisioning.scopesName.help') }}</small>
			</div>

			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.provisioning.scopesInstanceRoleClaimName') }}</label>
				<N8nInput
					v-model="form.scopesInstanceRoleClaimName"
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
					v-model="form.scopesProjectsRolesClaimName"
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
.container {
	padding-bottom: var(--spacing--2xl);
	max-width: 600px;
}

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
		padding: var(--spacing--2xs) 0;
		font-size: var(--font-size--2xs);
		color: var(--color--text);
	}
}

.frequencySelect {
	display: block;
	width: 240px;
}

.checkbox {
	margin-right: var(--spacing--xs);
	transform: scale(1.2);
}
</style>
