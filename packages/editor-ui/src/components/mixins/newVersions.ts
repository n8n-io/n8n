import mixins from 'vue-typed-mixins';
import { showMessage } from './showMessage';
import {
	IVersion,
} from '../../Interface';
import { VERSIONS_MODAL_KEY } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';

export const newVersions = mixins(
	showMessage,
).extend({
	computed: {
		...mapStores(useUIStore),
	},
	methods: {
		async checkForNewVersions() {
			const enabled = this.$store.getters['versions/areNotificationsEnabled'];
			if (!enabled) {
				return;
			}

			await this.$store.dispatch('versions/fetchVersions');

			const currentVersion: IVersion | undefined = this.$store.getters['versions/currentVersion'];
			const nextVersions: IVersion[] = this.$store.getters['versions/nextVersions'];
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
