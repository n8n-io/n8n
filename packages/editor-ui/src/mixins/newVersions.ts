import mixins from 'vue-typed-mixins';
import { showMessage } from './showMessage';
import { VERSIONS_MODAL_KEY } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useVersionsStore } from '@/stores/versions';

export const newVersions = mixins(showMessage).extend({
	computed: {
		...mapStores(useUIStore, useVersionsStore),
	},
	methods: {
		async checkForNewVersions() {
			const enabled = this.versionsStore.areNotificationsEnabled;
			if (!enabled) {
				return;
			}

			await this.versionsStore.fetchVersions();

			const currentVersion = this.versionsStore.currentVersion;
			const nextVersions = this.versionsStore.nextVersions;
			if (currentVersion && currentVersion.hasSecurityIssue && nextVersions.length) {
				const fixVersion = currentVersion.securityIssueFixVersion;
				let message = `Please update to latest version.`;
				if (fixVersion) {
					message = `Please update to version ${fixVersion} or higher.`;
				}

				message = `${message} <a class="primary-color">More info</a>`;
				this.$showToast({
					title: 'Critical update available',
					message,
					onClick: () => {
						this.uiStore.openModal(VERSIONS_MODAL_KEY);
					},
					closeOnClick: true,
					customClass: 'clickable',
					type: 'warning',
					duration: 0,
				});
			}
		},
	},
});
