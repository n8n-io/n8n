<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.headingContainer">
				<n8n-heading size="2xlarge">{{ $locale.baseText('settings.communityNodes') }}</n8n-heading>
				<n8n-button
					v-if="!isQueueModeEnabled && getInstalledPackages.length > 0 && !isLoading"
					label="Install"
					size="large"
					@click="openNPMPage"
				/>
			</div>
			<div :class="$style.loadingContainer" v-if="isLoading">
				<n8n-spinner size="large"/>
				<n8n-text>{{ $locale.baseText('settings.communityNodes.loading.message') }}</n8n-text>
			</div>
			<n8n-action-box
				v-else-if="isQueueModeEnabled"
				:heading="$locale.baseText('settings.communityNodes.empty.title')"
				:description="getEmptyStateDescription"
				:calloutText="actionBoxConfig.calloutText"
				:calloutTheme="actionBoxConfig.calloutTheme"
				@click="openNPMPage"
			/>
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
					@click="openNPMPage"
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
import Vue from 'vue';
import { mapGetters } from 'vuex';
import SettingsView from './SettingsView.vue';
import CommunityPackageCard from '../components/CommunityPackageCard.vue';

const PACKAGE_COUNT_THRESHOLD = 31;

export default Vue.extend({
	name: 'SettingsCommunityNodesView',
	components: {
		SettingsView,
		CommunityPackageCard,
	},
	async mounted() {
		try {
			await this.$store.dispatch('communityNodes/fetchInstalledPackages');
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
		openNPMPage() {
			// TODO: This will open new modal once it is implemented
			// window.open('https://www.npmjs.com/search?q=keywords:n8n-community-node-package', '_blank');
			this.$store.dispatch('ui/openModal', 'CommunityPackageInstallModal');
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
