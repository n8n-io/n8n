import { debounce } from 'lodash-es';
import { defineComponent } from 'vue';

export const debounceHelper = defineComponent({
	data() {
		return {
			debouncedFunctions: {} as Record<string, (...args: unknown[]) => Promise<void> | void>,
		};
	},
	methods: {
		async callDebounced(
			functionName: string,
			options: { debounceTime: number; trailing?: boolean },
			...inputParameters: unknown[]
		): Promise<void> {
			const { trailing, debounceTime } = options;
			if (this.debouncedFunctions[functionName] === undefined) {
				this.debouncedFunctions[functionName] = debounce(
					async (...args: unknown[]) => {
						// @ts-ignore
						await this[functionName](...args);
					},
					debounceTime,
					trailing ? { trailing } : { leading: true },
				);
			}
			await this.debouncedFunctions[functionName](...inputParameters);
		},
	},
});
