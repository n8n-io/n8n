import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { isResourceLocatorValue } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { canvasEventBus } from '@/features/canvas/canvas.eventBus';
import { DUPLICATE_MODAL_KEY, EXECUTE_WORKFLOW_NODE_TYPE, VIEWS } from '@/constants';
import type { IWorkflowToShare } from '@/Interface';
import { saveAs } from 'file-saver';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import type { CommandGroup, CommandBarItem } from '../commandBar.types';
import uniqBy from 'lodash/uniqBy';

export function useWorkflowCommands(): CommandGroup {
	const i18n = useI18n();
	const { editableWorkflow } = useCanvasOperations();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const tagsStore = useTagsStore();
	const workflowsStore = useWorkflowsStore();

	const router = useRouter();

	const workflowHelpers = useWorkflowHelpers();
	const telemetry = useTelemetry();
	const workflowSaving = useWorkflowSaving({ router });
	const workflowActivate = useWorkflowActivate();

	const credentialCommands = computed<CommandBarItem[]>(() => {
		const credentials = uniqBy(
			editableWorkflow.value.nodes.map((node) => Object.values(node.credentials ?? {})).flat(),
			(cred) => cred.id,
		);
		if (credentials.length === 0) {
			return [];
		}
		return [
			{
				id: 'open-credential',
				title: i18n.baseText('commandBar.workflow.openCredential'),
				section: i18n.baseText('commandBar.sections.credentials'),
				children: [
					...credentials.map((credential) => ({
						id: credential.id as string,
						title: credential.name,
						handler: () => {
							if (typeof credential.id === 'string') {
								uiStore.openExistingCredential(credential.id);
							}
						},
					})),
				],
			},
		];
	});

	const subworkflowCommands = computed<CommandBarItem[]>(() => {
		const subworkflows = editableWorkflow.value.nodes
			.filter((node) => node.type === EXECUTE_WORKFLOW_NODE_TYPE)
			.map((node) => node?.parameters?.workflowId)
			.filter(
				(rlValue): rlValue is { value: string; cachedResultName: string } =>
					isResourceLocatorValue(rlValue) &&
					typeof rlValue.value === 'string' &&
					typeof rlValue.cachedResultName === 'string',
			)
			.map(({ value, cachedResultName }) => ({ id: value, name: cachedResultName }));
		if (subworkflows.length === 0) {
			return [];
		}
		return [
			{
				id: 'open-sub-workflow',
				title: i18n.baseText('commandBar.workflow.openSubworkflow'),
				children: [
					...subworkflows.map((workflow) => ({
						id: workflow.id,
						title: workflow.name,
						handler: () => {
							const { href } = router.resolve({
								name: VIEWS.WORKFLOW,
								params: { name: workflow.id },
							});
							window.open(href, '_blank', 'noreferrer');
						},
					})),
				],
			},
		];
	});

	const workflowCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: 'test-workflow',
				title: i18n.baseText('commandBar.workflow.test'),
				section: i18n.baseText('commandBar.sections.workflow'),
				keywords: [
					i18n.baseText('commandBar.workflow.keywords.test'),
					i18n.baseText('commandBar.workflow.keywords.execute'),
					i18n.baseText('commandBar.workflow.keywords.run'),
					i18n.baseText('commandBar.workflow.keywords.workflow'),
				],
				handler: () => {
					// Lazily instantiate useRunWorkflow only when the handler runs to avoid early initialization side effects
					void useRunWorkflow({ router }).runEntireWorkflow('main');
				},
			},
			{
				id: 'save-workflow',
				title: i18n.baseText('commandBar.workflow.save'),
				section: i18n.baseText('commandBar.sections.workflow'),
				handler: async () => {
					const saved = await workflowSaving.saveCurrentWorkflow();
					if (saved) {
						canvasEventBus.emit('saved:workflow');
					}
				},
			},
			...(workflowsStore.isWorkflowActive
				? [
						{
							id: 'deactivate-workflow',
							title: i18n.baseText('commandBar.workflow.deactivate'),
							section: i18n.baseText('commandBar.sections.workflow'),
							handler: () => {
								void workflowActivate.updateWorkflowActivation(workflowsStore.workflowId, false);
							},
						},
					]
				: [
						{
							id: 'activate-workflow',
							title: i18n.baseText('commandBar.workflow.activate'),
							section: i18n.baseText('commandBar.sections.workflow'),
							handler: () => {
								void workflowActivate.updateWorkflowActivation(workflowsStore.workflowId, true);
							},
						},
					]),
			{
				id: 'select-all',
				title: i18n.baseText('commandBar.workflow.selectAll'),
				section: i18n.baseText('commandBar.sections.workflow'),
				handler: () => {
					canvasEventBus.emit('nodes:selectAll');
				},
			},
			{
				id: 'tidy-up-workflow',
				title: i18n.baseText('commandBar.workflow.tidyUp'),
				section: i18n.baseText('commandBar.sections.workflow'),
				handler: () => {
					canvasEventBus.emit('tidyUp', {
						source: 'command-bar',
					});
				},
			},
			{
				id: 'duplicate-workflow',
				title: i18n.baseText('commandBar.workflow.duplicate'),
				section: i18n.baseText('commandBar.sections.workflow'),
				handler: () => {
					uiStore.openModalWithData({
						name: DUPLICATE_MODAL_KEY,
						data: {
							id: workflowsStore.workflowId,
							name: editableWorkflow.value.name,
							tags: editableWorkflow.value.tags,
						},
					});
				},
			},
			{
				id: 'download-workflow',
				title: i18n.baseText('commandBar.workflow.download'),
				section: i18n.baseText('commandBar.sections.workflow'),
				handler: async () => {
					const workflowData = await workflowHelpers.getWorkflowDataToSave();
					const { tags, ...data } = workflowData;
					const exportData: IWorkflowToShare = {
						...data,
						meta: {
							...workflowData.meta,
							instanceId: rootStore.instanceId,
						},
						tags: (tags ?? []).map((tagId) => {
							return tagsStore.tagsById[tagId];
						}),
					};
					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: 'application/json;charset=utf-8',
					});
					let name = editableWorkflow.value.name || 'unsaved_workflow';
					name = name.replace(/[^a-z0-9]/gi, '_');
					telemetry.track('User exported workflow', { workflow_id: workflowData.id });
					saveAs(blob, name + '.json');
				},
			},
		];
	});

	const allCommands = computed(() => [
		...workflowCommands.value,
		...credentialCommands.value,
		...subworkflowCommands.value,
	]);

	return {
		commands: allCommands,
	};
}
