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
			<div :class="$style.descriptionContainer">
				<div>
					<n8n-text>
						{{ $locale.baseText('settings.communityNodes.installModal.description') }}</n8n-text
					>&nbsp;
					<n8n-link :to="NPM_KEYWORD_SEARCH_URL">Read more</n8n-link>
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
					:tooltipText="$locale.baseText('settings.communityNodes.installModal.packageName.tooltip')"
				>
					<n8n-input
						name="packageNameInput"
						v-model="packageName"
						type="text"
						:placeholder="$locale.baseText('settings.communityNodes.installModal.packageName.placeholder')"
						:required="true"
						@input="checkOkToInstall"
					/>
				</n8n-input-label>
				<div :class="$style.infoText">
					<span
						size="small"
						v-html="$locale.baseText('settings.communityNodes.installModal.packageName.infoText')"
					></span>
				</div>
				<el-checkbox v-model="userAgreed" :class="$style.checkbox" @change="checkOkToInstall">
					<n8n-text>
						{{ $locale.baseText('settings.communityNodes.installModal.checkbox.label') }}
					</n8n-text><br />
					<n8n-link to="https://www.npmjs.com/search?q=n8n-community-node-package">Learn more</n8n-link>
				</el-checkbox>
			</div>
		</template>
		<template slot="footer">
			<n8n-button
				:loading="loading"
				:disabled="!okToInstall"
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
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY, NPM_KEYWORD_SEARCH_URL } from '../constants';

export default Vue.extend({
	name: 'CommunityPackageInstallModal',
	components: {
		Modal,
	},
	data() {
		return {
			packageName: '',
			userAgreed: false,
			modalBus: new Vue(),
			okToInstall: false,
			loading: false,
			COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
			NPM_KEYWORD_SEARCH_URL,
		};
	},
	methods: {
		openNPMPage() {
			window.open(NPM_KEYWORD_SEARCH_URL, '_blank');
		},
		checkOkToInstall() {
			this.okToInstall = this.userAgreed && this.packageName !== '';
		},
		onInstallClick() {
			this.loading = true;
		},
		onModalClose() {
			return !this.loading;
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

.checkbox {
	margin-top: var(--spacing-l);

	span:nth-child(2) {
		vertical-align: text-top;
	}
}
</style>
