<script setup lang="ts">
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';
import { ABOUT_MODAL_KEY } from '../constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/composables/useToast';
import { useClipboard } from '@/composables/useClipboard';
import { useDebugInfo } from '@/composables/useDebugInfo';
import { useI18n } from '@n8n/i18n';
import { getThirdPartyLicenses } from '@n8n/rest-api-client';

import { ElCol, ElRow } from 'element-plus';
import { N8nButton, N8nLink, N8nText } from '@n8n/design-system';
const modalBus = createEventBus();
const toast = useToast();
const i18n = useI18n();
const debugInfo = useDebugInfo();
const clipboard = useClipboard();
const rootStore = useRootStore();

const closeDialog = () => {
	modalBus.emit('close');
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
	<Modal
		max-width="540px"
		:title="i18n.baseText('about.aboutN8n')"
		:event-bus="modalBus"
		:name="ABOUT_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
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
						<div :class="$style.debugInfo" @click="copyDebugInfoToClipboard">
							<N8nLink>{{ i18n.baseText('about.debug.message') }}</N8nLink>
						</div>
					</ElCol>
				</ElRow>
			</div>
		</template>

		<template #footer>
			<div class="action-buttons">
				<N8nButton
					float="right"
					:label="i18n.baseText('about.close')"
					data-test-id="close-about-modal-button"
					@click="closeDialog"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing--sm);
	overflow-wrap: break-word;
}
</style>
