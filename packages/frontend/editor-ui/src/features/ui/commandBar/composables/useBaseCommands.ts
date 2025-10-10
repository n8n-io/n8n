import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { CommandGroup } from '../commandBar.types';

export function useBaseCommands(): CommandGroup {
	const i18n = useI18n();
	const baseCommands = computed(() => {
		return [
			{
				id: 'demo-action',
				title: i18n.baseText('commandBar.demo.availableEverywhere'),
				section: i18n.baseText('commandBar.sections.demo'),
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
