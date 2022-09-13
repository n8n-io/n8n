<template>
	<Modal
		width="540px"
		:name="COMMUNITY_PACKAGE_INSTALL_MODAL_KEY"
		:title="$locale.baseText('settings.communityNodes.installModal.title')"
		:eventBus="modalBus"
		:center="true"
		:beforeClose="onModalClose"
		:showClose="!loading"
	>
		<template slot="content">
			<div :class="[$style.descriptionContainer, 'p-s']">
				<div>
					<n8n-text>
						{{ $locale.baseText('settings.communityNodes.installModal.description') }}
					</n8n-text> <n8n-link
						:to="COMMUNITY_NODES_INSTALLATION_DOCS_URL"
						@click="onMoreInfoTopClick"
					>
							{{ $locale.baseText('_reusableDynamicText.moreInfo') }}
					</n8n-link>
				</div>
				<n8n-button
					:label="$locale.baseText('settings.communityNodes.browseButton.label')"
					icon="external-link-alt"
					:class="$style.browseButton"
					@click="openNPMPage"
				/>
			</div>
			<div :class="[$style.formContainer, 'mt-m']">
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
						:maxlength="214"
						:placeholder="$locale.baseText('settings.communityNodes.installModal.packageName.placeholder')"
						:required="true"
						:disabled="loading"
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
					@change="onCheckboxChecked"
				>
					<n8n-text>
						{{ $locale.baseText('settings.communityNodes.installModal.checkbox.label') }}
					</n8n-text><br />
					<n8n-link :to="COMMUNITY_NODES_RISKS_DOCS_URL" @click="onLearnMoreLinkClick">{{ $locale.baseText('_reusableDynamicText.moreInfo') }}</n8n-link>
				</el-checkbox>
			</div>
		</template>
		<template slot="footer">
			<n8n-button
				:loading="loading"
				:disabled="packageName === '' || loading"
				:label="loading ?
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
import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';

export default mixins(
	showMessage,
).extend({
	name: 'CommunityPackageInstallModal',
	components: {
		Modal,
	},
	data() {
		return {
			loading: false,
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
	methods: {
		openNPMPage() {
			this.$telemetry.track('user clicked cnr browse button', { source: 'cnr install modal' });
			window.open(NPM_KEYWORD_SEARCH_URL, '_blank');
		},
		async onInstallClick() {
			if (!this.userAgreed) {
				this.checkboxWarning = true;
			} else {
				try {
					this.$telemetry.track('user started cnr package install', { input_string: this.packageName, source: 'cnr settings page' });
					this.infoTextErrorMessage = '';
					this.loading = true;
					await this.$store.dispatch('communityNodes/installPackage', this.packageName);
					// TODO: We need to fetch a fresh list of installed packages until proper response is implemented on the back-end
					await this.$store.dispatch('communityNodes/fetchInstalledPackages');
					this.loading = false;
					this.modalBus.$emit('close');
					this.$showMessage({
						title: this.$locale.baseText('settings.communityNodes.messages.install.success'),
						type: 'success',
					});
				} catch(error) {
					if(error.httpStatusCode && error.httpStatusCode === 400) {
						this.infoTextErrorMessage = error.message;
					} else {
						this.$showError(
							error,
							this.$locale.baseText('settings.communityNodes.messages.install.error'),
						);
					}
				} finally {
					this.loading = false;
				}
			}
		},
		onCheckboxChecked() {
			this.checkboxWarning = false;
		},
		onModalClose() {
			return !this.loading;
		},
		onInputBlur() {
			this.packageName = this.packageName.replaceAll('npm i ', '').replaceAll('npm install ', '');
		},
		onMoreInfoTopClick() {
			this.$telemetry.track('user clicked cnr docs link', { source: 'install package modal top' });
		},
		onLearnMoreLinkClick() {
			this.$telemetry.track('user clicked cnr docs link', { source: 'install package modal bottom' });
		},
	},
});
</script>

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
