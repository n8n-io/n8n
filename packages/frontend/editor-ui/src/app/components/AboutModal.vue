<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ABOUT_MODAL_KEY } from '../constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useDebugInfo } from '@/app/composables/useDebugInfo';
import { useInstanceRegistryStore } from '@n8n/frontend-module-instance-registry';
import { useI18n } from '@n8n/i18n';
import { getThirdPartyLicenses } from '@n8n/rest-api-client';
import { useUIStore } from '@/app/stores/ui.store';

import { ElCol, ElRow } from 'element-plus';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
const toast = useToast();
const i18n = useI18n();
const debugInfo = useDebugInfo();
const clipboard = useClipboard();
const rootStore = useRootStore();
const instanceRegistryStore = useInstanceRegistryStore();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[ABOUT_MODAL_KEY]?.open === true);

onMounted(async () => {
	await instanceRegistryStore.fetchClusterInfo();
});

async function closeDialog() {
	uiStore.closeModal(ABOUT_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

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
	<N8nDialog
		:open="modalOpen"
		size="large"
		:header="i18n.baseText('about.aboutN8n')"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody :class="$style.container">
			<ElRow>
				<ElCol :span="8" class="info-name">
					<N8nText>{{ i18n.baseText('about.n8nVersion') }}</N8nText>
				</ElCol>
				<ElCol :span="16">
					<N8nText>{{ rootStore.versionCli }}</N8nText>
				</ElCol>
			</ElRow>
			<ElRow>
				<ElCol :span="8" class="info-name">
					<N8nText>{{ i18n.baseText('about.sourceCode') }}</N8nText>
				</ElCol>
				<ElCol :span="16">
					<N8nLink to="https://github.com/n8n-io/n8n">https://github.com/n8n-io/n8n</N8nLink>
				</ElCol>
			</ElRow>
			<ElRow>
				<ElCol :span="8" class="info-name">
					<N8nText>{{ i18n.baseText('about.license') }}</N8nText>
				</ElCol>
				<ElCol :span="16">
					<N8nLink to="https://github.com/n8n-io/n8n/blob/master/LICENSE.md">
						{{ i18n.baseText('about.n8nLicense') }}
					</N8nLink>
				</ElCol>
			</ElRow>
			<ElRow>
				<ElCol :span="8" class="info-name">
					<N8nText>{{ i18n.baseText('about.thirdPartyLicenses') }}</N8nText>
				</ElCol>
				<ElCol :span="16">
					<N8nLink @click="downloadThirdPartyLicenses">
						{{ i18n.baseText('about.thirdPartyLicensesLink') }}
					</N8nLink>
				</ElCol>
			</ElRow>
			<ElRow>
				<ElCol :span="8" class="info-name">
					<N8nText>{{ i18n.baseText('about.instanceID') }}</N8nText>
				</ElCol>
				<ElCol :span="16">
					<N8nText>{{ rootStore.instanceId }}</N8nText>
				</ElCol>
			</ElRow>
			<ElRow>
				<ElCol :span="8" class="info-name">
					<N8nText>{{ i18n.baseText('about.debug.title') }}</N8nText>
				</ElCol>
				<ElCol :span="16">
					<N8nLink @click="copyDebugInfoToClipboard">
						{{ i18n.baseText('about.debug.message') }}
					</N8nLink>
				</ElCol>
			</ElRow>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				float="right"
				:label="i18n.baseText('about.close')"
				data-test-id="close-about-modal-button"
				@click="closeDialog"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing--sm);
	overflow-wrap: break-word;
}
</style>
