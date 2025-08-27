<script setup lang="ts">
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';
import { ABOUT_MODAL_KEY } from '../constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/composables/useToast';
import { useClipboard } from '@/composables/useClipboard';
import { useDebugInfo } from '@/composables/useDebugInfo';
import { useI18n } from '@n8n/i18n';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import axios from 'axios';

const modalBus = createEventBus();
const toast = useToast();
const i18n = useI18n();
const debugInfo = useDebugInfo();
const clipboard = useClipboard();
const rootStore = useRootStore();

const getBrowserId = () => {
	let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
	if (!browserId) {
		browserId = crypto.randomUUID();
		localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
	}
	return browserId;
};

const closeDialog = () => {
	modalBus.emit('close');
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

const handleDownloadThirdPartyLicenses = async () => {
	try {
		const response = await axios.get('/rest/third-party-licenses', {
			responseType: 'blob',
			headers: {
				'push-ref': rootStore.restApiContext.pushRef,
				'browser-id': getBrowserId(),
			},
		});

		const filename =
			(response.headers['content-disposition'] as string)?.match(/filename="([^"]+)"/)?.[1] ??
			'THIRD_PARTY_LICENSES.md';

		const blob = new Blob([response.data], { type: 'text/markdown' });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	} catch (error) {
		toast.showError(error, i18n.baseText('about.thirdPartyLicenses.downloadError'));
	}
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
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ i18n.baseText('about.n8nVersion') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-text>{{ rootStore.versionCli }}</n8n-text>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ i18n.baseText('about.sourceCode') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-link to="https://github.com/n8n-io/n8n">https://github.com/n8n-io/n8n</n8n-link>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ i18n.baseText('about.license') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-link to="https://github.com/n8n-io/n8n/blob/master/LICENSE.md">
							{{ i18n.baseText('about.n8nLicense') }}
						</n8n-link>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ i18n.baseText('about.thirdPartyLicenses') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-link @click="handleDownloadThirdPartyLicenses">
							{{ i18n.baseText('about.thirdPartyLicensesLink') }}
						</n8n-link>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ i18n.baseText('about.instanceID') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<n8n-text>{{ rootStore.instanceId }}</n8n-text>
					</el-col>
				</el-row>
				<el-row>
					<el-col :span="8" class="info-name">
						<n8n-text>{{ i18n.baseText('about.debug.title') }}</n8n-text>
					</el-col>
					<el-col :span="16">
						<div :class="$style.debugInfo" @click="copyDebugInfoToClipboard">
							<n8n-link>{{ i18n.baseText('about.debug.message') }}</n8n-link>
						</div>
					</el-col>
				</el-row>
			</div>
		</template>

		<template #footer>
			<div class="action-buttons">
				<n8n-button
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
	margin-bottom: var(--spacing-s);
	overflow-wrap: break-word;
}
</style>
