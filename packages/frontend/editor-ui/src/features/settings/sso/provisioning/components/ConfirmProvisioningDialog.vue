<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { ElDialog } from 'element-plus';
import { N8nButton, N8nCard, N8nCheckbox, N8nIcon, N8nText } from '@n8n/design-system';
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
				<N8nText color="text-base"
					>{{
						locale.baseText(
							newProvisioningSetting === 'instance_and_project_roles'
								? 'settings.provisioningConfirmDialog.breakingChangeDescription.firstSentence.partOne.withProjectRoles'
								: 'settings.provisioningConfirmDialog.breakingChangeDescription.firstSentence.partOne',
						)
					}}
				</N8nText>
				<N8nText :class="$style.descriptionTextPartTwo" color="text-base">
					{{
						locale.baseText(
							'settings.provisioningConfirmDialog.breakingChangeDescription.firstSentence.partTwo',
						)
					}}</N8nText
				>
			</div>
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
				<N8nText
					v-n8n-html="
						locale.baseText(
							'settings.provisioningConfirmDialog.breakingChangeDescription.secondLine',
						)
					"
					color="text-base"
				></N8nText>
			</div>
			<ul :class="$style.list" class="mb-s">
				<li>
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.button.downloadInstanceRolesCsv')
					}}</N8nText>
					<N8nButton
						variant="ghost"
						v-if="!hasDownloadedInstanceRoleCsv"
						native-type="button"
						:icon="'file-download' as any"
						data-test-id="provisioning-download-instance-roles-csv-button"
						:disabled="downloadingInstanceRolesCsv"
						:loading="downloadingInstanceRolesCsv"
						:class="[$style.button, 'n8n-button--highlight']"
						@click="onDownloadInstanceRolesCsv"
					></N8nButton>
					<N8nIcon v-else icon="check" color="success" :class="$style.icon"></N8nIcon>
				</li>
				<li v-if="shouldShowProjectRolesCsv">
					<N8nText color="text-base">{{
						locale.baseText('settings.provisioningConfirmDialog.button.downloadProjectRolesCsv')
					}}</N8nText>
					<N8nButton
						variant="ghost"
						v-if="!hasDownloadedProjectRoleCsv"
						native-type="button"
						:icon="'file-download' as any"
						data-test-id="provisioning-download-project-roles-csv-button"
						:disabled="downloadingProjectRolesCsv"
						:loading="downloadingProjectRolesCsv"
						:class="[$style.button, 'n8n-button--highlight']"
						@click="onDownloadProjectRolesCsv"
					></N8nButton>
					<N8nIcon v-else icon="check" color="success" :class="$style.icon"></N8nIcon>
				</li>
			</ul>
		</template>
		<template v-else>
			<div class="mb-s">
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.disable.description')
				}}</N8nText>
			</div>
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
			<N8nCard :class="$style.card">
				<N8nCheckbox
					v-model="confirmationChecked"
					:disabled="
						!isDisablingProvisioning &&
						(!hasDownloadedInstanceRoleCsv ||
							(shouldShowProjectRolesCsv && !hasDownloadedProjectRoleCsv))
					"
					data-test-id="provisioning-confirmation-checkbox"
				>
					<template #label>
						<N8nText color="text-base">{{
							locale.baseText(`settings.provisioningConfirmDialog.${messagingKey}.checkbox`)
						}}</N8nText>
					</template>
				</N8nCheckbox>
			</N8nCard>
		</div>

		<template #footer>
			<N8nButton
				variant="ghost"
				type="button"
				data-test-id="provisioning-cancel-button"
				@click="emit('cancel')"
				>{{ locale.baseText('settings.provisioningConfirmDialog.button.cancel') }}</N8nButton
			>
			<N8nButton
				variant="solid"
				type="button"
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
.button {
	margin-left: var(--spacing--xs);
}

.card {
	background-color: var(--color--background--light-1);
}

.descriptionTextPartTwo {
	margin-left: 4px;
}

.icon {
	height: 32px; // to match height of download button
	margin: 0 var(--spacing--lg);
}

.list {
	padding: 0 var(--spacing--2xs);

	li {
		display: flex;
		align-items: center;

		&::before {
			content: '•';
			margin-right: var(--spacing--3xs);
			margin-bottom: 2px;
		}
	}
}
</style>
