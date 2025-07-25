import { ref } from 'vue';

export function useExecutingOutput() {
	const executingOutput = ref<string>('');

	const concatenateOutput = (output?: string) => {
		if (!output) return;
		executingOutput.value = (executingOutput.value || '') + output;
	};

	const clearOutput = () => {
		executingOutput.value = '';
	};

	return {
		executingOutput,
		concatenateOutput,
		clearOutput,
	};
}
