<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.headingContainer">
				<n8n-heading size="2xlarge">{{ $locale.baseText('settings.communityNodes') }}</n8n-heading>
				<n8n-button
					v-if="!isQueueModeEnabled && getInstalledPackages.length > 0 && !isLoading"
					label="Install"
					size="large"
					@click="openInstallModal"
				/>
			</div>
			<n8n-action-box
				v-if="isQueueModeEnabled"
				:heading="$locale.baseText('settings.communityNodes.empty.title')"
				:description="getEmptyStateDescription"
				:calloutText="actionBoxConfig.calloutText"
				:calloutTheme="actionBoxConfig.calloutTheme"
				@click="openInstallModal"
			/>
			<div
				:class="$style.cardsContainer"
				v-else-if="isLoading"
			>
				<community-package-card
					v-for="n in 2"
					:key="'index-' + n"
					:loading="true"
				></community-package-card>
			</div>
			<div
				v-else-if="getInstalledPackages.length === 0"
				:class="$style.actionBoxContainer"
			>
				<n8n-action-box
					:heading="$locale.baseText('settings.communityNodes.empty.title')"
					:description="getEmptyStateDescription"
					:buttonText="$locale.baseText('settings.communityNodes.empty.installPackageLabel')"
					:calloutText="actionBoxConfig.calloutText"
					:calloutTheme="actionBoxConfig.calloutTheme"
					@click="openInstallModal"
				/>
			</div>
			<div
				:class="$style.cardsContainer"
				v-else
			>
				<community-package-card
					v-for="communityPackage in getInstalledPackages"
					:key="communityPackage.packageName"
					:communityPackage="communityPackage"
				></community-package-card>
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { mapGetters } from 'vuex';
import SettingsView from './SettingsView.vue';
import CommunityPackageCard from '../components/CommunityPackageCard.vue';
import { showMessage } from '@/components/mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY } from '../constants';

const PACKAGE_COUNT_THRESHOLD = 31;

export default mixins(
	showMessage,
).extend({
	name: 'SettingsCommunityNodesView',
	components: {
		SettingsView,
		CommunityPackageCard,
	},
	async mounted() {
		try {
			await this.$store.dispatch('communityNodes/fetchInstalledPackages');
		} catch (error) {
			this.$showError(
				error,
				this.$locale.baseText('settings.communityNodes.fetchError.title'),
				this.$locale.baseText('settings.communityNodes.fetchError.message'),
			);
		}
		try {
			await this.$store.dispatch('communityNodes/fetchAvailableCommunityPackageCount');
		} finally { }
	},
	computed: {
		...mapGetters('settings', ['isQueueModeEnabled']),
		...mapGetters('communityNodes', ['getInstalledPackages', 'isLoading']),
		getEmptyStateDescription() {
			const packageCount = this.$store.getters['communityNodes/availablePackageCount'];
			return  packageCount < PACKAGE_COUNT_THRESHOLD ?
				this.$locale.baseText('settings.communityNodes.empty.description.no-packages') :
				this.$locale.baseText('settings.communityNodes.empty.description', { interpolate: { count: (Math.floor(packageCount / 10) * 10).toString() } });
		},
		actionBoxConfig() {
			return this.isQueueModeEnabled ? {
				calloutText: this.$locale.baseText('settings.communityNodes.queueMode.warning'),
				calloutTheme: 'warning',
				hideButton: true,
			} : {
				calloutText: '',
				calloutTheme: '',
				hideButton: false,
			};
		},
	},
	methods: {
		openInstallModal() {
			this.$store.dispatch('ui/openModal', COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
		},
	},
});
</script>

<style lang="scss" module>
	.container {
		height: 100%;
		padding-right: var(--spacing-2xs);
		> * {
			margin-bottom: var(--spacing-2xl);
		}
	}

	.headingContainer {
		display: flex;
		justify-content: space-between;
	}

	.loadingContainer {
		display: flex;
		gap: var(--spacing-xs);
	}

	.actionBoxContainer {
		text-align: center;
	}

	.cardsContainer {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2xs);
	}
</style>
