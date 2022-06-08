<template>
	<Modal
		width="540px"
		:name="COMMUNITY_PACKAGE_INSTALL_MODAL_KEY"
		:title="$locale.baseText('settings.communityNodes.installModal.title')"
		:eventBus="modalBus"
		:center="true"
		:beforeClose="onModalClose"
		:showClose="!isLoading"
	>
		<template slot="content">
			<div :class="$style.descriptionContainer">
				<div>
					<n8n-text>
						{{ $locale.baseText('settings.communityNodes.installModal.description') }}</n8n-text
					>&nbsp;
					<n8n-link :to="COMMUNITY_NODES_INSTALLATION_DOCS_URL">{{ $locale.baseText('_reusableDynamicText.readMore') }}</n8n-link>
				</div>
				<n8n-button
					:label="$locale.baseText('settings.communityNodes.browseButton.label')"
					icon="external-link-alt"
					@click="openNPMPage"
				/>
			</div>
			<div :class="$style.formContainer">
				<n8n-input-label
					:class="$style.labelTooltip"
					:label="$locale.baseText('settings.communityNodes.installModal.packageName.label')"
					:tooltipText="$locale.baseText('settings.communityNodes.installModal.packageName.tooltip',
						{ interpolate: { npmURL: NPM_KEYWORD_SEARCH_URL } }
					)"
				>
					<n8n-input
						name="packageNameInput"
						v-model="packageName"
						type="text"
						:placeholder="$locale.baseText('settings.communityNodes.installModal.packageName.placeholder')"
						:required="true"
						:disabled="isLoading"
						@blur="onInputBlur"
					/>
				</n8n-input-label>
				<div :class="$style.infoText">
					<span
						size="small"
						:class="[$style.infoText, infoTextErrorMessage ? $style.error : '']"
						v-html="infoTextErrorMessage || $locale.baseText('settings.communityNodes.installModal.packageName.infoText')"
					></span>
				</div>
				<el-checkbox
					v-model="userAgreed"
					:class="[$style.checkbox, checkboxWarning ? $style.error : '']"
					:disabled="isLoading"
					@change="onCheckboxChecked"
				>
					<n8n-text>
						{{ $locale.baseText('settings.communityNodes.installModal.checkbox.label') }}
					</n8n-text><br />
					<n8n-link :to="COMMUNITY_NODES_RISKS_DOCS_URL">{{ $locale.baseText('_reusableDynamicText.learnMore') }}</n8n-link>
				</el-checkbox>
			</div>
		</template>
		<template slot="footer">
			<n8n-button
				:loading="isLoading"
				:disabled="packageName === '' || isLoading"
				:label="isLoading ?
					$locale.baseText('settings.communityNodes.installModal.installButton.label.loading') :
					$locale.baseText('settings.communityNodes.installModal.installButton.label')"
				size="large"
				float="right"
				@click="onInstallClick"
			/>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import Modal from './Modal.vue';
import {
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	NPM_KEYWORD_SEARCH_URL,
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
	COMMUNITY_NODES_RISKS_DOCS_URL,
} from '../constants';
import { mapGetters } from 'vuex';
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';
import { json } from 'express';

export default mixins(
	showMessage,
).extend({
	name: 'CommunityPackageInstallModal',
	components: {
		Modal,
	},
	data() {
		return {
			packageName: '',
			userAgreed: false,
			modalBus: new Vue(),
			checkboxWarning: false,
			infoTextErrorMessage: '',
			COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
			NPM_KEYWORD_SEARCH_URL,
			COMMUNITY_NODES_INSTALLATION_DOCS_URL,
			COMMUNITY_NODES_RISKS_DOCS_URL,
		};
	},
	computed: {
		...mapGetters('communityNodes', ['isLoading']),
	},
	methods: {
		openNPMPage() {
			window.open(NPM_KEYWORD_SEARCH_URL, '_blank');
		},
		async onInstallClick() {
			if(!this.userAgreed) {
				this.checkboxWarning = true;
			}else {
				try {
					this.infoTextErrorMessage = '';
					await this.$store.dispatch('communityNodes/installPackage', this.packageName);
					this.$showMessage({
						title: this.$locale.baseText('settings.communityNodes.messages.install.success'),
						type: 'success',
					});
					this.modalBus.$emit('close');
					await this.$store.dispatch('communityNodes/fetchInstalledPackages');
				} catch(error) {
					this.infoTextErrorMessage = error.message;
				}
			}
		},
		onCheckboxChecked() {
			this.checkboxWarning = false;
		},
		onModalClose() {
			return !this.isLoading;
		},
		onInputBlur() {
			this.packageName = this.packageName.replaceAll('npm i ', '').replaceAll('npm install ', '');
		},
	},
});
</script>

<style module lang="scss">
.descriptionContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing-s);
	border: var(--border-width-base) var(--border-style-base) var(--color-info-tint-1);
	border-radius: var(--border-radius-large);
}

.formContainer {
	margin-top: var(--spacing-m);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-base);
}

.infoText {
	margin-top: var(--spacing-4xs);
}

.checkbox {
	margin-top: var(--spacing-l);

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
