<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.headingContainer">
				<n8n-heading size="2xlarge">{{ $locale.baseText('settings.communityNodes') }}</n8n-heading>
				<n8n-button
					v-if="!isQueueModeEnabled && getInstalledPackages.length > 0 && !loading"
					:label="$locale.baseText('settings.communityNodes.installModal.installButton.label')"
					size="large"
					@click="openInstallModal"
				/>
			</div>
			<div v-if="isQueueModeEnabled" :class="$style.actionBoxContainer">
				<n8n-action-box
					:heading="$locale.baseText('settings.communityNodes.empty.title')"
					:description="getEmptyStateDescription"
					:calloutText="actionBoxConfig.calloutText"
					:calloutTheme="actionBoxConfig.calloutTheme"
					@descriptionClick="onDescriptionTextClick"
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
				v-else-if="getInstalledPackages.length === 0"
				:class="$style.actionBoxContainer"
			>
				<n8n-action-box
					:heading="$locale.baseText('settings.communityNodes.empty.title')"
					:description="getEmptyStateDescription"
					:buttonText="
						isNpmAvailable
							? $locale.baseText('settings.communityNodes.empty.installPackageLabel')
							: ''
					"
					:calloutText="actionBoxConfig.calloutText"
					:calloutTheme="actionBoxConfig.calloutTheme"
					@click="openInstallModal"
					@descriptionClick="onDescriptionTextClick"
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
import {
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
	COMMUNITY_NODES_NPM_INSTALLATION_URL,
} from '../constants';
import { PublicInstalledPackage } from 'n8n-workflow';

const PACKAGE_COUNT_THRESHOLD = 31;

export default mixins(
	showMessage,
).extend({
	name: 'SettingsCommunityNodesView',
	components: {
		SettingsView,
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
			await this.$store.dispatch('communityNodes/fetchInstalledPackages');

			const installedPackages: PublicInstalledPackage[] = this.getInstalledPackages;
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
			await this.$store.dispatch('communityNodes/fetchAvailableCommunityPackageCount');
		} finally {
			this.$data.loading = false;
		}
	},
	computed: {
		...mapGetters('settings', ['isNpmAvailable', 'isQueueModeEnabled']),
		...mapGetters('communityNodes', ['getInstalledPackages']),
		getEmptyStateDescription() {
			const packageCount = this.$store.getters['communityNodes/availablePackageCount'];
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
		actionBoxConfig() {
			if (!this.isNpmAvailable) {
				return {
					calloutText: this.$locale.baseText(
						'settings.communityNodes.npmUnavailable.warning',
						{ interpolate: { npmUrl: COMMUNITY_NODES_NPM_INSTALLATION_URL } },
					),
					calloutTheme: 'warning',
					hideButton: true,
				};
			}

			if (this.isQueueModeEnabled) {
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
			this.$telemetry.track('user clicked cnr install button', { is_empty_state: this.getInstalledPackages.length === 0 });
			this.$store.dispatch('ui/openModal', COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
		},
		onDescriptionTextClick(event: MouseEvent) {
			if ((event.target as Element).localName === 'a') {
				this.$telemetry.track('user clicked cnr learn more link', { source: 'cnr settings page' });
			}
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
