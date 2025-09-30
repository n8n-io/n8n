import { computed } from 'vue';
import { useTemplatesStore } from '@/stores/templates.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CommandGroup } from './types';

const Section = {
	TEMPLATES: 'Templates',
} as const;

export function useTemplateCommands(): CommandGroup {
	const { openWorkflowTemplate } = useCanvasOperations();
	const templatesStore = useTemplatesStore();

	const importTemplateCommands = computed(() => {
		const templateWorkflows = Object.values(templatesStore.workflows);
		return templateWorkflows.map((template) => {
			const { id, name } = template;
			return {
				id: id.toString(),
				title: `Import template > ${name}`,
				section: Section.TEMPLATES,
				handler: async () => {
					await openWorkflowTemplate(id.toString());
				},
			};
		});
	});

	const templateCommands = computed(() => {
		return [
			{
				id: 'import-template',
				title: 'Import template',
				children: [...importTemplateCommands.value],
				section: Section.TEMPLATES,
			},
		];
	});

	return {
		commands: templateCommands,
	};
}
