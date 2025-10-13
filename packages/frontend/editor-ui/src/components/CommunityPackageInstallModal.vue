<script setup lang="ts">
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/components/Modal.vue';
import {
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	NPM_KEYWORD_SEARCH_URL,
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
	COMMUNITY_NODES_RISKS_DOCS_URL,
} from '@/constants';
import { useToast } from '@/composables/useToast';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { ref } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

import { ElCheckbox } from 'element-plus';
import { N8nButton, N8nInput, N8nInputLabel, N8nLink, N8nText } from '@n8n/design-system';
const communityNodesStore = useCommunityNodesStore();

const toast = useToast();
const telemetry = useTelemetry();
const i18n = useI18n();

const modalBus = createEventBus();

const loading = ref(false);
const packageName = ref('');
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
		try {
			telemetry.track('user started cnr package install', {
				input_string: packageName.value,
				source: 'cnr settings page',
			});
			infoTextErrorMessage.value = '';
			loading.value = true;
			await communityNodesStore.installPackage(packageName.value);
			await useNodeTypesStore().getNodeTypes();
			loading.value = false;
			modalBus.emit('close');
			toast.showMessage({
				title: i18n.baseText('settings.communityNodes.messages.install.success'),
				type: 'success',
			});
		} catch (error) {
			if (error.httpStatusCode && error.httpStatusCode === 400) {
				infoTextErrorMessage.value = error.message;
			} else {
				toast.showError(error, i18n.baseText('settings.communityNodes.messages.install.error'));
			}
		} finally {
			loading.value = false;
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
			<div :class="[$style.descriptionContainer, 'p-s']">
				<div>
					<N8nText>
						{{ i18n.baseText('settings.communityNodes.installModal.description') }}
					</N8nText>
					{{ ' ' }}
					<N8nLink :to="COMMUNITY_NODES_INSTALLATION_DOCS_URL" @click="onMoreInfoTopClick">
						{{ i18n.baseText('generic.moreInfo') }}
					</N8nLink>
				</div>
				<N8nButton
					:label="i18n.baseText('settings.communityNodes.browseButton.label')"
					icon="external-link"
					:class="$style.browseButton"
					@click="openNPMPage"
				/>
			</div>
			<div :class="[$style.formContainer, 'mt-m']">
				<N8nInputLabel
					:class="$style.labelTooltip"
					:label="i18n.baseText('settings.communityNodes.installModal.packageName.label')"
					:tooltip-text="
						i18n.baseText('settings.communityNodes.installModal.packageName.tooltip', {
							interpolate: { npmURL: NPM_KEYWORD_SEARCH_URL },
						})
					"
				>
					<N8nInput
						v-model="packageName"
						name="packageNameInput"
						type="text"
						data-test-id="package-name-input"
						:maxlength="214"
						:placeholder="
							i18n.baseText('settings.communityNodes.installModal.packageName.placeholder')
						"
						:required="true"
						:disabled="loading"
						@blur="onInputBlur"
					/>
				</N8nInputLabel>
				<div :class="[$style.infoText, 'mt-4xs']">
					<span
						size="small"
						:class="[$style.infoText, infoTextErrorMessage ? $style.error : '']"
						v-text="infoTextErrorMessage"
					></span>
				</div>
				<ElCheckbox
					v-model="userAgreed"
					:class="[$style.checkbox, checkboxWarning ? $style.error : '', 'mt-l']"
					:disabled="loading"
					data-test-id="user-agreement-checkbox"
					@update:model-value="onCheckboxChecked"
				>
					<N8nText>
						{{ i18n.baseText('settings.communityNodes.installModal.checkbox.label') }} </N8nText
					><br />
					<N8nLink :to="COMMUNITY_NODES_RISKS_DOCS_URL" @click="onLearnMoreLinkClick">{{
						i18n.baseText('generic.moreInfo')
					}}</N8nLink>
				</ElCheckbox>
			</div>
		</template>
		<template #footer>
			<N8nButton
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
	border: var(--border-width) var(--border-style) var(--color-info-tint-1);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);

	button {
		& > span {
			flex-direction: row-reverse;
			& > span {
				margin-left: var(--spacing--3xs);
			}
		}
	}
}

.formContainer {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text);
}

.checkbox {
	span:nth-child(2) {
		vertical-align: text-top;
	}
}

.error {
	color: var(--color--danger);

	span {
		border-color: var(--color--danger);
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
		margin-top: var(--spacing--2xs);
	}
}
</style>
