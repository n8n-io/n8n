<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	N8nAlertDialog,
	N8nPreviewBadge,
	N8nSelect2,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSwitch,
	N8nText,
} from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { VIEWS } from '@/app/constants';

const props = defineProps<{
	initialEnabled: boolean;
	initialAlwaysRequired: boolean;
	managedByEnv: boolean;
}>();

const router = useRouter();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast, showError } = useToast();

const enabled = ref(props.initialEnabled);
const alwaysRequired = ref(props.initialAlwaysRequired);
const showDisableDialog = ref(false);
const isSaving = ref(false);

function onToggle(value: boolean) {
	if (!value) {
		showDisableDialog.value = true;
		return;
	}
	void persist(true);
}

async function persist(value: boolean): Promise<void> {
	const previousValue = enabled.value;
	enabled.value = value;
	isSaving.value = true;

	try {
		const response = await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			workflowReviews: { enabled: value },
		});
		if (response.workflowReviews) {
			enabled.value = response.workflowReviews.enabled;
			alwaysRequired.value = response.workflowReviews.alwaysRequired === true;
			settingsStore.setWorkflowReviewsPolicy(response.workflowReviews);
		}
		showToast({
			type: 'success',
			title: i18n.baseText(
				`settings.security.workflowReviews.success.${enabled.value ? 'enabled' : 'disabled'}`,
			),
			message: '',
		});
	} catch (error) {
		enabled.value = previousValue;
		showError(error, i18n.baseText('settings.security.workflowReviews.error'));
	} finally {
		isSaving.value = false;
	}
}

type RequireApprovalOption = 'whenConfigured' | 'always';

const requireApprovalOptions = computed<Array<SelectOptionBase<RequireApprovalOption>>>(() => [
	{
		value: 'whenConfigured',
		label: i18n.baseText('settings.security.workflowReviews.requireApproval.option.whenConfigured'),
		icon: 'lock-unlocked',
	},
	{
		value: 'always',
		label: i18n.baseText('settings.security.workflowReviews.requireApproval.option.always'),
		icon: 'lock',
	},
]);

const requireApproval = computed<RequireApprovalOption>(() =>
	alwaysRequired.value ? 'always' : 'whenConfigured',
);

async function persistAlwaysRequired(selected: SelectValue | undefined): Promise<void> {
	const value = selected === 'always';
	if (value === alwaysRequired.value) return;

	const previousValue = alwaysRequired.value;
	alwaysRequired.value = value;
	isSaving.value = true;

	try {
		const response = await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			workflowReviews: { alwaysRequired: value },
		});
		if (response.workflowReviews) {
			// Another admin may have turned reviews off since this page loaded.
			enabled.value = response.workflowReviews.enabled;
			alwaysRequired.value = response.workflowReviews.alwaysRequired === true;
			settingsStore.setWorkflowReviewsPolicy(response.workflowReviews);
		}
		showToast({
			type: 'success',
			title: i18n.baseText('settings.security.workflowReviews.requireApproval.success'),
			message: '',
		});
	} catch (error) {
		alwaysRequired.value = previousValue;
		showError(error, i18n.baseText('settings.security.workflowReviews.error'));
	} finally {
		isSaving.value = false;
	}
}

function openProjects() {
	void router.push({ name: VIEWS.SECURITY_WORKFLOW_REVIEW_INSTANCE_SETTINGS });
}

function confirmDisable() {
	showDisableDialog.value = false;
	void persist(false);
}
</script>

<template>
	<div>
		<N8nSettingsRowGroup>
			<N8nSettingsRow>
				<template #info>
					<N8nText :bold="true">
						{{ i18n.baseText('settings.security.workflowReviews.enable.title') }}
						<N8nPreviewBadge
							class="ml-4xs"
							data-test-id="security-workflow-reviews-preview-badge"
						/>
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.workflowReviews.enable.description') }}
					</N8nText>
				</template>
				<template #action>
					<N8nSwitch
						:model-value="enabled"
						size="large"
						:disabled="managedByEnv || isSaving"
						:aria-label="i18n.baseText('settings.security.workflowReviews.enable.title')"
						data-test-id="security-workflow-reviews-toggle"
						@update:model-value="onToggle"
					/>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				v-if="enabled"
				:title="i18n.baseText('settings.security.workflowReviews.requireApproval.title')"
				data-test-id="security-workflow-reviews-require-approval-row"
			>
				<template #action>
					<N8nSelect2
						:model-value="requireApproval"
						:items="requireApprovalOptions"
						size="medium"
						:disabled="managedByEnv || isSaving"
						:aria-label="i18n.baseText('settings.security.workflowReviews.requireApproval.title')"
						data-test-id="security-workflow-reviews-require-approval-select"
						data-attr="security-workflow-reviews-require-approval-select"
						@update:model-value="persistAlwaysRequired"
					/>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				v-if="enabled"
				clickable
				data-test-id="security-workflow-reviews-projects-row"
				data-attr="security-workflow-reviews-projects-row"
				@click="openProjects"
			>
				<template #info>
					<N8nText :bold="true">{{ i18n.baseText('generic.projects') }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.workflowReviews.instanceSettings.description') }}
					</N8nText>
				</template>
				<template #action>
					<N8nSettingsRowConfigure
						:value="i18n.baseText('settings.security.workflowReviews.instanceSettings.viewAll')"
					/>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>

		<N8nAlertDialog
			:open="showDisableDialog"
			:title="i18n.baseText('settings.security.workflowReviews.confirmDisable.headline')"
			:description="i18n.baseText('settings.security.workflowReviews.confirmDisable.message')"
			@action="confirmDisable"
			@cancel="showDisableDialog = false"
			@update:open="showDisableDialog = $event"
		/>
	</div>
</template>
