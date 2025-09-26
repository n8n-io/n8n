<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import { useInstallNode } from '@/composables/useInstallNode';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
	COMMUNITY_NODES_RISKS_DOCS_URL,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	NPM_KEYWORD_SEARCH_URL,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, ref } from 'vue';

interface ModalData {
	packageName?: string;
	disableInput?: boolean;
	hideSuggestion?: boolean;
	nodeType?: string;
}

const telemetry = useTelemetry();
const i18n = useI18n();
const { installNode, loading } = useInstallNode();
const uiStore = useUIStore();

const modalBus = createEventBus();

const modalData = computed(
	() => uiStore.modalsById[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY].data as ModalData | undefined,
);
const packageName = ref(modalData.value?.packageName ?? '');
const userAgreed = ref(false);
const checkboxWarning = ref(false);
const infoTextErrorMessage = ref('');

const openNPMPage = () => {
	telemetry.track('user clicked cnr browse button', { source: 'cnr install modal' });
	window.open(NPM_KEYWORD_SEARCH_URL, '_blank');
};

const onInstallClick = async () => {
	if (!userAgreed.value) {
		checkboxWarning.value = true;
	} else {
		telemetry.track('user started cnr package install', {
			input_string: packageName.value,
			source: 'cnr settings page',
		});

		infoTextErrorMessage.value = '';
		const result = await installNode({
			type: 'unverified',
			packageName: packageName.value,
			nodeType: modalData.value?.nodeType,
		});
		if (result.error && 'httpStatusCode' in result.error && result.error.httpStatusCode === 400) {
			infoTextErrorMessage.value = result.error.message;
		}

		if (result.success) {
			modalBus.emit('close');
		}
	}
};

const onCheckboxChecked = () => {
	checkboxWarning.value = false;
};

const onModalClose = () => {
	return !loading.value;
};

const onInputBlur = () => {
	packageName.value = packageName.value.replaceAll('npm i ', '').replaceAll('npm install ', '');
};

const onMoreInfoTopClick = () => {
	telemetry.track('user clicked cnr docs link', { source: 'install package modal top' });
};

const onLearnMoreLinkClick = () => {
	telemetry.track('user clicked cnr docs link', {
		source: 'install package modal bottom',
	});
};
</script>

<template>
	<Modal
		width="540px"
		:name="COMMUNITY_PACKAGE_INSTALL_MODAL_KEY"
		:title="i18n.baseText('settings.communityNodes.installModal.title')"
		:event-bus="modalBus"
		:center="true"
		:before-close="onModalClose"
		:show-close="!loading"
	>
		<template #content>
			<div v-if="!modalData?.hideSuggestion" :class="[$style.descriptionContainer, 'p-s']">
				<div>
					<n8n-text>
						{{ i18n.baseText('settings.communityNodes.installModal.description') }}
					</n8n-text>
					{{ ' ' }}
					<n8n-link :to="COMMUNITY_NODES_INSTALLATION_DOCS_URL" @click="onMoreInfoTopClick">
						{{ i18n.baseText('generic.moreInfo') }}
					</n8n-link>
				</div>
				<n8n-button
					:label="i18n.baseText('settings.communityNodes.browseButton.label')"
					icon="external-link"
					:class="$style.browseButton"
					@click="openNPMPage"
				/>
			</div>
			<div :class="[$style.formContainer, 'mt-m']">
				<n8n-input-label
					:class="$style.labelTooltip"
					:label="i18n.baseText('settings.communityNodes.installModal.packageName.label')"
					:tooltip-text="
						i18n.baseText('settings.communityNodes.installModal.packageName.tooltip', {
							interpolate: { npmURL: NPM_KEYWORD_SEARCH_URL },
						})
					"
				>
					<n8n-input
						v-model="packageName"
						name="packageNameInput"
						type="text"
						data-test-id="package-name-input"
						:maxlength="214"
						:placeholder="
							i18n.baseText('settings.communityNodes.installModal.packageName.placeholder')
						"
						:required="true"
						:disabled="loading || modalData?.disableInput"
						@blur="onInputBlur"
					/>
				</n8n-input-label>
				<div :class="[$style.infoText, 'mt-4xs']">
					<span
						size="small"
						:class="[$style.infoText, infoTextErrorMessage ? $style.error : '']"
						v-text="infoTextErrorMessage"
					></span>
				</div>
				<el-checkbox
					v-model="userAgreed"
					:class="[$style.checkbox, checkboxWarning ? $style.error : '', 'mt-l']"
					:disabled="loading"
					data-test-id="user-agreement-checkbox"
					@update:model-value="onCheckboxChecked"
				>
					<n8n-text>
						{{ i18n.baseText('settings.communityNodes.installModal.checkbox.label') }} </n8n-text
					><br />
					<n8n-link :to="COMMUNITY_NODES_RISKS_DOCS_URL" @click="onLearnMoreLinkClick">{{
						i18n.baseText('generic.moreInfo')
					}}</n8n-link>
				</el-checkbox>
			</div>
		</template>
		<template #footer>
			<n8n-button
				:loading="loading"
				:disabled="!userAgreed || packageName === '' || loading"
				:label="
					loading
						? i18n.baseText('settings.communityNodes.installModal.installButton.label.loading')
						: i18n.baseText('settings.communityNodes.installModal.installButton.label')
				"
				size="large"
				float="right"
				data-test-id="install-community-package-button"
				@click="onInstallClick"
			/>
		</template>
	</Modal>
</template>

<style module lang="scss">
.descriptionContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border: var(--border-width-base) var(--border-style-base) var(--color-info-tint-1);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-light);

	button {
		& > span {
			flex-direction: row-reverse;
			& > span {
				margin-left: var(--spacing-3xs);
			}
		}
	}
}

.formContainer {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-base);
}

.checkbox {
	span:nth-child(2) {
		vertical-align: text-top;
	}
}

.error {
	color: var(--color-danger);

	span {
		border-color: var(--color-danger);
	}
}
</style>

<style lang="scss">
.el-tooltip__popper {
	max-width: 240px;
	img {
		width: 100%;
	}
	p {
		line-height: 1.2;
	}
	p + p {
		margin-top: var(--spacing-2xs);
	}
}
</style>
