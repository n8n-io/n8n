<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { ElDialog } from 'element-plus';
import { N8nButton, N8nCheckbox, N8nIcon, N8nText } from '@n8n/design-system';
import { ref, watch, computed } from 'vue';
import { useAccessSettingsCsvExport } from '@/features/settings/sso/provisioning/composables/useAccessSettingsCsvExport';
import type { UserRoleProvisioningSetting } from './UserRoleProvisioningDropdown.vue';
import type { SupportedProtocolType } from '../../sso.store';

const visible = defineModel<boolean>();

const props = defineProps<{
	newProvisioningSetting: UserRoleProvisioningSetting;
	authProtocol: SupportedProtocolType;
}>();

const emit = defineEmits<{
	confirmProvisioning: [];
	cancel: [];
}>();

const locale = useI18n();
const downloadingInstanceRolesCsv = ref(false);
const downloadingProjectRolesCsv = ref(false);
const loading = ref(false);
const confirmationChecked = ref(false);
const {
	hasDownloadedInstanceRoleCsv,
	hasDownloadedProjectRoleCsv,
	downloadProjectRolesCsv,
	downloadInstanceRolesCsv,
	accessSettingsCsvExportOnModalClose,
} = useAccessSettingsCsvExport();

const isDisablingProvisioning = computed(() => props.newProvisioningSetting === 'disabled');

const messagingKey = computed(() => (isDisablingProvisioning.value ? 'disable' : 'enable'));

const shouldShowProjectRolesCsv = computed(
	() => props.newProvisioningSetting === 'instance_and_project_roles',
);

watch(visible, () => {
	loading.value = false;
	confirmationChecked.value = false;
	accessSettingsCsvExportOnModalClose();
});

const onDownloadInstanceRolesCsv = async () => {
	downloadingInstanceRolesCsv.value = true;
	try {
		await downloadInstanceRolesCsv();
	} finally {
		downloadingInstanceRolesCsv.value = false;
	}
};

const onDownloadProjectRolesCsv = async () => {
	downloadingProjectRolesCsv.value = true;
	try {
		await downloadProjectRolesCsv();
	} finally {
		downloadingProjectRolesCsv.value = false;
	}
};

const onConfirmProvisioningSetting = () => {
	loading.value = true;
	emit('confirmProvisioning');
};
</script>
<template>
	<ElDialog
		v-model="visible"
		:title="locale.baseText(`settings.provisioningConfirmDialog.${messagingKey}.title`)"
		width="650"
	>
		<template v-if="!isDisablingProvisioning">
			<div class="mb-s">
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.firstLine')
				}}</N8nText>
			</div>
			<ul :class="$style.list" class="mb-s">
				<li>
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.list.one')
					}}</N8nText>
				</li>
				<li v-if="newProvisioningSetting === 'instance_and_project_roles'">
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.list.two')
					}}</N8nText>
				</li>
			</ul>
			<div class="mb-s">
				<N8nText color="text-base"
					><a
						:href="`https://docs.n8n.io/user-management/${authProtocol}/setup/`"
						target="_blank"
						>{{ locale.baseText('settings.provisioningConfirmDialog.link.docs') }}</a
					></N8nText
				>
			</div>
			<div class="mb-s">
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.breakingChangeRequiredSteps')
				}}</N8nText>
			</div>
			<div class="mb-s" :class="$style.buttonRow">
				<N8nButton
					type="secondary"
					native-type="button"
					data-test-id="provisioning-download-instance-roles-csv-button"
					:disabled="downloadingInstanceRolesCsv"
					:loading="downloadingInstanceRolesCsv"
					:class="$style.button"
					@click="onDownloadInstanceRolesCsv"
					>{{
						locale.baseText('settings.provisioningConfirmDialog.button.downloadInstanceRolesCsv')
					}}</N8nButton
				>
				<N8nIcon
					v-if="hasDownloadedInstanceRoleCsv"
					icon="check"
					color="success"
					:class="$style.icon"
				/>
			</div>
			<div v-if="shouldShowProjectRolesCsv" class="mb-s" :class="$style.buttonRow">
				<N8nButton
					type="secondary"
					native-type="button"
					data-test-id="provisioning-download-project-roles-csv-button"
					:disabled="downloadingProjectRolesCsv"
					:loading="downloadingProjectRolesCsv"
					:class="$style.button"
					@click="onDownloadProjectRolesCsv"
					>{{
						locale.baseText('settings.provisioningConfirmDialog.button.downloadProjectRolesCsv')
					}}</N8nButton
				>
				<N8nIcon
					v-if="hasDownloadedProjectRoleCsv"
					icon="check"
					color="success"
					:class="$style.icon"
				/>
			</div>
		</template>
		<template v-else>
			<div class="mb-s">
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.disable.description')
				}}</N8nText>
			</div>
			<div class="mb-s">
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.disable.whatWillHappen')
				}}</N8nText>
			</div>
			<ul :class="$style.list" class="mb-s">
				<li>
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.disable.list.one')
					}}</N8nText>
				</li>
				<li>
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.disable.list.two')
					}}</N8nText>
				</li>
			</ul>
			<div class="mb-s">
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.disable.beforeSaving')
				}}</N8nText>
			</div>
			<ul :class="$style.list" class="mb-s">
				<li>
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.disable.checklist.one')
					}}</N8nText>
				</li>
				<li>
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.disable.checklist.two')
					}}</N8nText>
				</li>
			</ul>
			<div class="mb-s">
				<N8nText color="text-base"
					><a
						:href="`https://docs.n8n.io/user-management/${authProtocol}/setup/`"
						target="_blank"
						>{{ locale.baseText('settings.provisioningConfirmDialog.link.docs') }}</a
					></N8nText
				>
			</div>
		</template>
		<div class="mb-s">
			<N8nCheckbox
				v-model="confirmationChecked"
				:disabled="
					!isDisablingProvisioning &&
					(!hasDownloadedInstanceRoleCsv ||
						(shouldShowProjectRolesCsv && !hasDownloadedProjectRoleCsv))
				"
				data-test-id="provisioning-confirmation-checkbox"
			>
				<N8nText color="text-base">{{
					locale.baseText(`settings.provisioningConfirmDialog.${messagingKey}.checkbox`)
				}}</N8nText>
			</N8nCheckbox>
		</div>

		<template #footer>
			<N8nButton
				type="tertiary"
				native-type="button"
				data-test-id="provisioning-cancel-button"
				@click="emit('cancel')"
				>{{ locale.baseText('settings.provisioningConfirmDialog.button.cancel') }}</N8nButton
			>
			<N8nButton
				type="primary"
				native-type="button"
				:disabled="
					loading ||
					!confirmationChecked ||
					(!isDisablingProvisioning && !hasDownloadedInstanceRoleCsv) ||
					(shouldShowProjectRolesCsv && !hasDownloadedProjectRoleCsv)
				"
				data-test-id="provisioning-confirm-button"
				@click="onConfirmProvisioningSetting"
				>{{
					locale.baseText(`settings.provisioningConfirmDialog.button.${messagingKey}.confirm`)
				}}</N8nButton
			>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.buttonRow {
	display: flex;
	align-items: center;
}

.button {
	min-width: 340px;
}

.icon {
	margin-left: var(--spacing--xs);
}

.list {
	padding: 0 var(--spacing--sm);

	li {
		list-style: disc outside;
	}
}
</style>
