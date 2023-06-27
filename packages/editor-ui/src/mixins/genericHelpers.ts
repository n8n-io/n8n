import { defineComponent } from 'vue';
import dateformat from 'dateformat';

import { VIEWS } from '@/constants';
import { useToast } from '@/composables';

export const genericHelpers = defineComponent({
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			loadingService: null as any | null,
		};
	},
	computed: {
		isReadOnlyRoute(): boolean {
			return ![VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW, VIEWS.LOG_STREAMING_SETTINGS].includes(
				this.$route.name as VIEWS,
			);
		},
	},
	methods: {
		displayTimer(msPassed: number, showMs = false): string {
			if (msPassed < 60000) {
				if (!showMs) {
					return `${Math.floor(msPassed / 1000)}${this.$locale.baseText(
						'genericHelpers.secShort',
					)}`;
				}

				return `${msPassed / 1000}${this.$locale.baseText('genericHelpers.secShort')}`;
			}

			const secondsPassed = Math.floor(msPassed / 1000);
			const minutesPassed = Math.floor(secondsPassed / 60);
			const secondsLeft = (secondsPassed - minutesPassed * 60).toString().padStart(2, '0');

			return `${minutesPassed}:${secondsLeft}${this.$locale.baseText('genericHelpers.minShort')}`;
		},
		convertToDisplayDate(fullDate: Date | string | number): { date: string; time: string } {
			const mask = `d mmm${
				new Date(fullDate).getFullYear() === new Date().getFullYear() ? '' : ', yyyy'
			}#HH:MM:ss`;
			const formattedDate = dateformat(fullDate, mask);
			const [date, time] = formattedDate.split('#');
			return { date, time };
		},
		editAllowedCheck(): boolean {
			if (this.isReadOnlyRoute) {
				this.showMessage({
					// title: 'Workflow can not be changed!',
					title: this.$locale.baseText('genericHelpers.showMessage.title'),
					message: this.$locale.baseText('genericHelpers.showMessage.message'),
					type: 'info',
					duration: 0,
					dangerouslyUseHTMLString: true,
				});

				return false;
			}
			return true;
		},

		/**
		 * @note Loading helpers extracted as composable in useLoadingService
		 */

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
