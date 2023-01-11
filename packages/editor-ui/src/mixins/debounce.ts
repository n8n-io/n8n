import { debounce } from 'lodash';
import Vue from 'vue';

export const debounceHelper = Vue.extend({
	data() {
		return {
			debouncedFunctions: [] as any[],
		};
	},
	methods: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		async callDebounced(...inputParameters: any[]): Promise<void> {
			const functionName = inputParameters.shift() as string;
			const { trailing, debounceTime } = inputParameters.shift();

			// @ts-ignore
			if (this.debouncedFunctions[functionName] === undefined) {
				// @ts-ignore
				this.debouncedFunctions[functionName] = debounce(
					this[functionName],
					debounceTime,
					trailing ? { trailing } : { leading: true },
				);
			}
			// @ts-ignore
			await this.debouncedFunctions[functionName].apply(this, inputParameters);
		},
	},
});
