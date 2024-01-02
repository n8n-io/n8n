import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useSourceControlStore } from '@/stores/sourceControl.store';

export const genericHelpers = defineComponent({
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			loadingService: null as null | { close: () => void; text: string },
		};
	},
	computed: {
		...mapStores(useSourceControlStore),
		isReadOnlyRoute(): boolean {
			return ![
				VIEWS.WORKFLOW,
				VIEWS.NEW_WORKFLOW,
				VIEWS.LOG_STREAMING_SETTINGS,
				VIEWS.EXECUTION_DEBUG,
			].includes(this.$route.name as VIEWS);
		},
		readOnlyEnv(): boolean {
			return this.sourceControlStore.preferences.branchReadOnly;
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

		/**
		 * @note Loading helpers extracted as composable in useLoadingService
		 */

		startLoading(text?: string) {
			if (this.loadingService !== null) {
				return;
			}

			this.loadingService = this.$loading({
				lock: true,
				text: text || this.$locale.baseText('genericHelpers.loading'),
				background: 'var(--color-dialog-overlay-background)',
			});
		},
		setLoadingText(text: string) {
			if (this.loadingService !== null) {
				this.loadingService.text = text;
			}
		},
		stopLoading() {
			if (this.loadingService !== null) {
				this.loadingService.close();
				this.loadingService = null;
			}
		},
		isRedirectSafe() {
			const redirect = this.getRedirectQueryParameter();
			return redirect.startsWith('/');
		},
		getRedirectQueryParameter() {
			let redirect = '';
			if (typeof this.$route.query.redirect === 'string') {
				redirect = decodeURIComponent(this.$route.query.redirect);
			}
			return redirect;
		},
	},
});
