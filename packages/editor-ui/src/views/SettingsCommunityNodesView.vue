<template>
	<div :class="$style.container">
		<div :class="$style.headingContainer">
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.communityNodes') }}</n8n-heading>
			<n8n-button
				v-if="!settingsStore.isQueueModeEnabled && communityNodesStore.getInstalledPackages.length > 0 && !loading"
				:label="$locale.baseText('settings.communityNodes.installModal.installButton.label')"
				size="large"
				@click="openInstallModal"
			/>
		</div>
		<div v-if="settingsStore.isQueueModeEnabled" :class="$style.actionBoxContainer">
			<n8n-action-box
				:heading="$locale.baseText('settings.communityNodes.empty.title')"
				:description="getEmptyStateDescription"
				:calloutText="actionBoxConfig.calloutText"
				:calloutTheme="actionBoxConfig.calloutTheme"
			/>
		</div>
		<div
			:class="$style.cardsContainer"
			v-else-if="loading"
		>
			<community-package-card
				v-for="n in 2"
				:key="'index-' + n"
				:loading="true"
			></community-package-card>
		</div>
		<div
			v-else-if="communityNodesStore.getInstalledPackages.length === 0"
			:class="$style.actionBoxContainer"
		>
			<n8n-action-box
				:heading="$locale.baseText('settings.communityNodes.empty.title')"
				:description="getEmptyStateDescription"
				:buttonText="
					shouldShowInstallButton
						? $locale.baseText('settings.communityNodes.empty.installPackageLabel')
						: ''
				"
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
				v-for="communityPackage in communityNodesStore.getInstalledPackages"
				:key="communityPackage.packageName"
				:communityPackage="communityPackage"
			></community-package-card>
		</div>
	</div>
</template>

<script lang="ts">
import {
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
	COMMUNITY_NODES_NPM_INSTALLATION_URL,
} from '@/constants';
import CommunityPackageCard from '@/components/CommunityPackageCard.vue';
import { showMessage } from '@/mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { PublicInstalledPackage } from 'n8n-workflow';

import { useCommunityNodesStore } from '@/stores/communityNodes';
import { useUIStore } from '@/stores/ui';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings';

const PACKAGE_COUNT_THRESHOLD = 31;

export default mixins(
	showMessage,
).extend({
	name: 'SettingsCommunityNodesView',
	components: {
		CommunityPackageCard,
	},
	data () {
		return {
			loading: false,
		};
	},
	async mounted() {
		try {
			this.$data.loading = true;
			await this.communityNodesStore.fetchInstalledPackages();

			const installedPackages: PublicInstalledPackage[] = this.communityNodesStore.getInstalledPackages;
			const packagesToUpdate: PublicInstalledPackage[] = installedPackages.filter(p => p.updateAvailable );
			this.$telemetry.track('user viewed cnr settings page', {
				num_of_packages_installed: installedPackages.length,
				installed_packages: installedPackages.map(p => {
					return {
						package_name: p.packageName,
						package_version: p.installedVersion,
						package_nodes: p.installedNodes.map(node => `${node.name}-v${node.latestVersion}`),
						is_update_available: p.updateAvailable !== undefined,
					};
				}),
				packages_to_update: packagesToUpdate.map(p => {
					return {
						package_name: p.packageName,
						package_version_current: p.installedVersion,
						package_version_available: p.updateAvailable,
					};
				}),
				number_of_updates_available: packagesToUpdate.length,
			});
		} catch (error) {
			this.$showError(
				error,
				this.$locale.baseText('settings.communityNodes.fetchError.title'),
				this.$locale.baseText('settings.communityNodes.fetchError.message'),
			);
		} finally {
			this.$data.loading = false;
		}
		try {
			await this.communityNodesStore.fetchAvailableCommunityPackageCount();
		} finally {
			this.$data.loading = false;
		}
	},
	computed: {
		...mapStores(
			useCommunityNodesStore,
			useSettingsStore,
			useUIStore,
		),
		getEmptyStateDescription() {
			const packageCount = this.communityNodesStore.availablePackageCount;
			return  packageCount < PACKAGE_COUNT_THRESHOLD ?
				this.$locale.baseText('settings.communityNodes.empty.description.no-packages', {
					interpolate: {
						docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
					},
				}) :
				this.$locale.baseText('settings.communityNodes.empty.description', {
					interpolate: {
						docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
						count: (Math.floor(packageCount / 10) * 10).toString(),
					},
				});
		},
		shouldShowInstallButton() {
			return !this.settingsStore.isDesktopDeployment && this.settingsStore.isNpmAvailable;
		},
		actionBoxConfig() {
			if (this.settingsStore.isDesktopDeployment) {
				return {
					calloutText: this.$locale.baseText('settings.communityNodes.notAvailableOnDesktop'),
					calloutTheme: 'warning',
					hideButton: true,
				};
			}

			if (!this.settingsStore.isNpmAvailable) {
				return {
					calloutText: this.$locale.baseText(
						'settings.communityNodes.npmUnavailable.warning',
						{ interpolate: { npmUrl: COMMUNITY_NODES_NPM_INSTALLATION_URL } },
					),
					calloutTheme: 'warning',
					hideButton: true,
				};
			}

			if (this.settingsStore.isQueueModeEnabled) {
				return {
					calloutText: this.$locale.baseText(
						'settings.communityNodes.queueMode.warning',
						{ interpolate: { docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL } },
					),
					calloutTheme: 'warning',
					hideButton: true,
				};
			}

			return {
				calloutText: '',
				calloutTheme: '',
				hideButton: false,
			};
		},
	},
	methods: {
		openInstallModal(event: MouseEvent) {
			const telemetryPayload = { is_empty_state: this.communityNodesStore.getInstalledPackages.length === 0 };
			this.$telemetry.track('user clicked cnr install button', telemetryPayload);
			this.$externalHooks().run('settingsCommunityNodesView.openInstallModal', telemetryPayload);
			this.uiStore.openModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
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
