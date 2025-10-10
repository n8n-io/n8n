import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CommandGroup } from '../commandBar.types';

export function useTemplateCommands(): CommandGroup {
	const i18n = useI18n();
	const { openWorkflowTemplate } = useCanvasOperations();
	const templatesStore = useTemplatesStore();

	const importTemplateCommands = computed(() => {
		const templateWorkflows = Object.values(templatesStore.workflows);
		return templateWorkflows.map((template) => {
			const { id, name } = template;
			return {
				id: id.toString(),
				title: i18n.baseText('commandBar.templates.importWithPrefix', {
					interpolate: { templateName: name },
				}),
				section: i18n.baseText('commandBar.sections.templates'),
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
				title: i18n.baseText('commandBar.templates.import'),
				children: [...importTemplateCommands.value],
				section: i18n.baseText('commandBar.sections.templates'),
			},
		];
	});

	return {
		commands: templateCommands,
	};
}
