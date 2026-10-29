<script setup lang="ts">
import { onMounted } from 'vue';
import { ABOUT_MODAL_KEY } from '../constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useDebugInfo } from '@/app/composables/useDebugInfo';
import { useUIStore } from '@/app/stores/ui.store';
import { useInstanceRegistryStore } from '@n8n/frontend-module-instance-registry';
import { useI18n } from '@n8n/i18n';
import { getThirdPartyLicenses } from '@n8n/rest-api-client';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nIcon,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nText,
} from '@n8n/design-system';

const SOURCE_CODE_HOST = 'github.com/n8n-io/n8n';
const SOURCE_CODE_URL = `https://${SOURCE_CODE_HOST}`;
const LICENSE_URL = `${SOURCE_CODE_URL}/blob/master/LICENSE.md`;

const toast = useToast();
const i18n = useI18n();
const debugInfo = useDebugInfo();
const clipboard = useClipboard();
const rootStore = useRootStore();
const uiStore = useUIStore();
const instanceRegistryStore = useInstanceRegistryStore();

onMounted(async () => {
	await instanceRegistryStore.fetchClusterInfo();
});

const onOpenChange = (open: boolean) => {
	if (!open) uiStore.closeModal(ABOUT_MODAL_KEY);
};

const copyInstanceId = async () => {
	await clipboard.copy(rootStore.instanceId);
	toast.showMessage({ title: i18n.baseText('about.instanceID.copied'), type: 'success' });
};

const downloadThirdPartyLicenses = async () => {
	try {
		const thirdPartyLicenses = await getThirdPartyLicenses(rootStore.restApiContext);

		const blob = new File([thirdPartyLicenses], 'THIRD_PARTY_LICENSES.md', {
			type: 'text/markdown',
		});
		window.open(URL.createObjectURL(blob));
	} catch (error) {
		toast.showToast({
			title: i18n.baseText('about.thirdPartyLicenses.downloadError'),
			message: error.message,
			type: 'error',
		});
	}
};

const copyDebugInfoToClipboard = async () => {
	toast.showToast({
		title: i18n.baseText('about.debug.toast.title'),
		message: i18n.baseText('about.debug.toast.message'),
		type: 'info',
		duration: 5000,
	});
	await clipboard.copy(debugInfo.generateDebugInfo());
};
</script>

<template>
	<!-- Nothing to confirm here, so the title row's close button is the only way out. -->
	<N8nDialog
		:open="true"
		size="large"
		:header="i18n.baseText('about.aboutN8n')"
		:aria-description="i18n.baseText('about.ariaDescription')"
		data-test-id="about-modal"
		@update:open="onOpenChange"
	>
		<N8nDialogBody>
			<N8nSettingsRowGroup>
				<N8nSettingsRow :title="i18n.baseText('about.n8nVersion')">
					<template #action>
						<N8nText size="medium" color="text-dark" data-test-id="about-modal-version">
							{{ rootStore.versionCli }}
						</N8nText>
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow
					:title="i18n.baseText('about.instanceID')"
					:description="rootStore.instanceId"
					:max-description-lines="1"
				>
					<template #action>
						<N8nButton
							variant="outline"
							size="medium"
							icon="copy"
							:label="i18n.baseText('generic.copy')"
							data-test-id="about-modal-copy-instance-id"
							@click="copyInstanceId"
						/>
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow :title="i18n.baseText('about.sourceCode')" :description="SOURCE_CODE_HOST">
					<template #action>
						<N8nButton variant="outline" size="medium" :href="SOURCE_CODE_URL" target="_blank">
							{{ i18n.baseText('generic.open') }}
							<N8nIcon icon="external-link" size="small" />
						</N8nButton>
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow
					:title="i18n.baseText('about.license')"
					:description="i18n.baseText('about.n8nLicense')"
				>
					<template #action>
						<N8nButton variant="outline" size="medium" :href="LICENSE_URL" target="_blank">
							{{ i18n.baseText('generic.open') }}
							<N8nIcon icon="external-link" size="small" />
						</N8nButton>
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow
					:title="i18n.baseText('about.thirdPartyLicenses')"
					:description="i18n.baseText('about.thirdPartyLicenses.description')"
				>
					<template #action>
						<N8nButton
							variant="outline"
							size="medium"
							data-test-id="about-modal-third-party-licenses"
							@click="downloadThirdPartyLicenses"
						>
							{{ i18n.baseText('generic.open') }}
							<N8nIcon icon="external-link" size="small" />
						</N8nButton>
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow
					:title="i18n.baseText('about.debug.title')"
					:description="i18n.baseText('about.debug.description')"
				>
					<template #action>
						<N8nButton
							variant="outline"
							size="medium"
							icon="copy"
							:label="i18n.baseText('generic.copy')"
							data-test-id="about-modal-copy-debug-info"
							@click="copyDebugInfoToClipboard"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nDialogBody>
	</N8nDialog>
</template>
