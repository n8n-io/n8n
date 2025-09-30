import { computed } from 'vue';
import type { CommandGroup } from './types';

export function useBaseCommands(): CommandGroup {
	const baseCommands = computed(() => {
		return [
			{
				id: 'demo-action',
				title: 'This is available everywhere',
				section: 'Demo',
				handler: () => {
					console.log('hello');
				},
			},
		];
	});

	return {
		commands: baseCommands,
	};
}
