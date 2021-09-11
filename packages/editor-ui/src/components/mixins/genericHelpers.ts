import { showMessage } from '@/components/mixins/showMessage';
import { debounce } from 'lodash';

import mixins from 'vue-typed-mixins';

export const genericHelpers = mixins(showMessage).extend({
	data () {
		return {
			loadingService: null as any | null, // tslint:disable-line:no-any
			debouncedFunctions: [] as any[], // tslint:disable-line:no-any
		};
	},
	computed: {
		isReadOnly (): boolean {
			if (['NodeViewExisting', 'NodeViewNew'].includes(this.$route.name as string)) {
				return false;
			}
			return true;
		},
	},
	methods: {
		displayTimer (msPassed: number, showMs = false): string {
			if (msPassed < 60000) {
				if (showMs === false) {
					return `${Math.floor(msPassed / 1000)} sec.`;
				}

				return `${msPassed / 1000} sec.`;
			}

			const secondsPassed = Math.floor(msPassed / 1000);
			const minutesPassed = Math.floor(secondsPassed / 60);
			const secondsLeft = (secondsPassed - (minutesPassed * 60)).toString().padStart(2, '0');

			return `${minutesPassed}:${secondsLeft} min.`;
		},
		editAllowedCheck (): boolean {
			if (this.isReadOnly) {
				this.$showMessage({
					title: 'Workflow can not be changed!',
					message: `The workflow can not be edited as a past execution gets displayed. To make changed either open the original workflow of which the execution gets displayed or save it under a new name first.`,
					type: 'error',
					duration: 0,
				});

				return false;
			}
			return true;
		},

		startLoading (text?: string) {
			if (this.loadingService !== null) {
				return;
			}

			// @ts-ignore
			this.loadingService = this.$loading(
				{
					lock: true,
					text: text || 'Loading',
					spinner: 'el-icon-loading',
					background: 'rgba(255, 255, 255, 0.8)',
				},
			);
		},
		setLoadingText (text: string) {
			this.loadingService.text = text;
		},
		stopLoading () {
			if (this.loadingService !== null) {
				this.loadingService.close();
				this.loadingService = null;
			}
		},

		async callDebounced (...inputParameters: any[]): Promise<void> { // tslint:disable-line:no-any
			const functionName = inputParameters.shift() as string;
			const debounceTime = inputParameters.shift() as number;

			// @ts-ignore
			if (this.debouncedFunctions[functionName] === undefined) {
				// @ts-ignore
				this.debouncedFunctions[functionName] = debounce(this[functionName], debounceTime, { leading: true });
			}
			// @ts-ignore
			await this.debouncedFunctions[functionName].apply(this, inputParameters);
		},
	},
});
