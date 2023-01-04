import { showMessage } from '@/mixins/showMessage';
import { VIEWS } from '@/constants';

import mixins from 'vue-typed-mixins';

export const genericHelpers = mixins(showMessage).extend({
	data() {
		return {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			loadingService: null as any | null,
		};
	},
	computed: {
		isReadOnly(): boolean {
			return ![VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW, VIEWS.LOG_STREAMING_SETTINGS].includes(
				this.$route.name as VIEWS,
			);
		},
	},
	methods: {
		displayTimer(msPassed: number, showMs = false): string {
			if (msPassed < 60000) {
				if (!showMs) {
					return `${Math.floor(msPassed / 1000)} ${this.$locale.baseText('genericHelpers.sec')}`;
				}

				return `${msPassed / 1000} ${this.$locale.baseText('genericHelpers.sec')}`;
			}

			const secondsPassed = Math.floor(msPassed / 1000);
			const minutesPassed = Math.floor(secondsPassed / 60);
			const secondsLeft = (secondsPassed - minutesPassed * 60).toString().padStart(2, '0');

			return `${minutesPassed}:${secondsLeft} ${this.$locale.baseText('genericHelpers.min')}`;
		},
		editAllowedCheck(): boolean {
			if (this.isReadOnly) {
				this.$showMessage({
					// title: 'Workflow can not be changed!',
					title: this.$locale.baseText('genericHelpers.showMessage.title'),
					message: this.$locale.baseText('genericHelpers.showMessage.message'),
					type: 'info',
					duration: 0,
				});

				return false;
			}
			return true;
		},

		startLoading(text?: string) {
			if (this.loadingService !== null) {
				return;
			}

			// @ts-ignore
			this.loadingService = this.$loading({
				lock: true,
				text: text || this.$locale.baseText('genericHelpers.loading'),
				spinner: 'el-icon-loading',
				background: 'rgba(255, 255, 255, 0.8)',
			});
		},
		setLoadingText(text: string) {
			this.loadingService.text = text;
		},
		stopLoading() {
			if (this.loadingService !== null) {
				this.loadingService.close();
				this.loadingService = null;
			}
		},
	},
});
