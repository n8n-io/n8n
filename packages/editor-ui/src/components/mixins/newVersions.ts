import mixins from 'vue-typed-mixins';
import { showMessage } from './showMessage';
import {
	IVersion,
} from '../../Interface';

export const newVersions = mixins(
	showMessage,
).extend({
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
				this.$showWarning('Critical update available', message, {
					onClick: () => {
						this.$store.dispatch('ui/openUpdatesPanel');
					},
					closeOnClick: true,
					customClass: 'clickable',
					duration: 0,
				});
			}
		},
	},
});