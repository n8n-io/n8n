<template>
	<SettingsView>
		<div :class="$style.container">
			<div>
				<n8n-heading size="2xlarge">{{ $locale.baseText('settings.communityNodes') }}</n8n-heading>
			</div>
			<div :class="$style.actionBoxContainer">
				<n8n-action-box
					:heading="$locale.baseText('settings.communityNodes.empty.title')"
					:description="getEmptyStateDescription"
					:buttonText="$locale.baseText('settings.communityNodes.empty.installPackageLabel')"
					:calloutText="actionBoxConfig.calloutText"
					:calloutTheme="actionBoxConfig.calloutTheme"
					:hideButton="actionBoxConfig.hideButton"
					@click="openNPMPage"
				/>
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import SettingsView from './SettingsView.vue';
export default Vue.extend({
	name: 'SettingsCommunityNodesView',
	components: {
		SettingsView,
	},
	async mounted() {
		await this.$store.dispatch('communityNodes/fetchAvailableCommunityPackageCount');
	},
	computed: {
		...mapGetters('settings', ['executionMode']),
		getEmptyStateDescription() {
			// Get the number for NPM packages with `n8n-community-node-package` keyword
			// If there are > 31 packages available, show the number rounded to nearest 10 (floor) for nicer display
			const packageCount = this.$store.getters['communityNodes/packageCount'];
			return  packageCount < 31 ?
				this.$locale.baseText('settings.communityNodes.empty.description.no-packages') :
				this.$locale.baseText('settings.communityNodes.empty.description', { interpolate: { count: (Math.floor(packageCount / 10) * 10).toString() } });
		},
		actionBoxConfig() {
			return this.executionMode === 'queue' ? {
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
			window.open('https://www.npmjs.com/search?q=keywords:n8n-community-node-package', '_blank');
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
	.actionBoxContainer {
		text-align: center;
	}
</style>
