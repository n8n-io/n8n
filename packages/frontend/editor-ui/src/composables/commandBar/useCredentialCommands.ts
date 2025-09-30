import { computed } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import uniqBy from 'lodash/uniqBy';
import type { CommandGroup } from './types';

const Section = {
	CREDENTIALS: 'Credentials',
} as const;

export function useCredentialCommands(): CommandGroup {
	const { editableWorkflow } = useCanvasOperations();
	const uiStore = useUIStore();

	const credentialCommands = computed(() => {
		const credentials = uniqBy(
			editableWorkflow.value.nodes.map((node) => Object.values(node.credentials ?? {})).flat(),
			(cred) => cred.id,
		);
		if (credentials.length === 0) {
			return [];
		}
		return [
			{
				id: 'Open credential',
				title: 'Open credential',
				section: Section.CREDENTIALS,
				children: [
					...credentials.map((credential) => ({
						id: credential.id as string,
						title: credential.name,
						handler: () => {
							uiStore.openExistingCredential(credential.id as string);
						},
					})),
				],
			},
		];
	});

	return {
		commands: credentialCommands,
	};
}
