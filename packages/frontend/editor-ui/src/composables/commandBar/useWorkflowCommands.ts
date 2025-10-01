import { type Component, computed } from 'vue';
import { useRouter } from 'vue-router';
import { isResourceLocatorValue } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { canvasEventBus } from '@/event-bus/canvas';
import {
	DUPLICATE_MODAL_KEY,
	EXECUTE_WORKFLOW_NODE_TYPE,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	VIEWS,
} from '@/constants';
import type { IWorkflowToShare } from '@/Interface';
import { saveAs } from 'file-saver';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowActivate } from '../useWorkflowActivate';
import type { CommandGroup, CommandBarItem } from './types';
import uniqBy from 'lodash/uniqBy';
import { nodeViewEventBus } from '@/event-bus';

const ITEM_ID = {
	OPEN_CREDENTIAL: 'open-credential',
	OPEN_SUB_WORKFLOW: 'open-sub-workflow',
	TEST_WORKFLOW: 'test-workflow',
	SAVE_WORKFLOW: 'save-workflow',
	ACTIVATE_WORKFLOW: 'activate-workflow',
	DEACTIVATE_WORKFLOW: 'deactivate-workflow',
	SELECT_ALL: 'select-all',
	TIDY_UP_WORKFLOW: 'tidy-up-workflow',
	DUPLICATE_WORKFLOW: 'duplicate-workflow',
	DOWNLOAD_WORKFLOW: 'download-workflow',
	IMPORT_WORKFLOW_FROM_URL: 'import-workflow-from-url',
	IMPORT_WORKFLOW_FROM_FILE: 'import-workflow-from-file',
	ARCHIVE_WORKFLOW: 'archive-workflow',
	UNARCHIVE_WORKFLOW: 'unarchive-workflow',
	DELETE_WORKFLOW: 'delete-workflow',
} as const;

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
				id: ITEM_ID.OPEN_CREDENTIAL,
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
				icon: {
					component: N8nIcon as Component,
					props: {
						icon: 'arrow-right',
					},
				},
			},
		];
	});

	const canvasActions = computed<CommandBarItem[]>(() => [
		{
			id: ITEM_ID.SAVE_WORKFLOW,
			title: i18n.baseText('commandBar.workflow.save'),
			section: i18n.baseText('commandBar.sections.workflow'),
			handler: async () => {
				const saved = await workflowSaving.saveCurrentWorkflow();
				if (saved) {
					canvasEventBus.emit('saved:workflow');
				}
			},
			icon: {
				component: N8nIcon as Component,
				props: {
					icon: 'save',
				},
			},
		},
		{
			id: ITEM_ID.TEST_WORKFLOW,
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
			icon: {
				component: N8nIcon as Component,
				props: {
					icon: 'flask-conical',
				},
			},
		},
		{
			id: ITEM_ID.SELECT_ALL,
			title: i18n.baseText('commandBar.workflow.selectAll'),
			section: i18n.baseText('commandBar.sections.workflow'),
			handler: () => {
				canvasEventBus.emit('nodes:selectAll');
			},
			icon: {
				component: N8nIcon as Component,
				props: {
					icon: 'list-checks',
				},
			},
		},
		{
			id: ITEM_ID.TIDY_UP_WORKFLOW,
			title: i18n.baseText('commandBar.workflow.tidyUp'),
			section: i18n.baseText('commandBar.sections.workflow'),
			handler: () => {
				canvasEventBus.emit('tidyUp', {
					source: 'command-bar',
				});
			},
			icon: {
				component: N8nIcon as Component,
				props: {
					icon: 'wand-sparkles',
				},
			},
		},
		{
			id: ITEM_ID.DUPLICATE_WORKFLOW,
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
			icon: {
				component: N8nIcon as Component,
				props: {
					icon: 'copy',
				},
			},
		},
	]);

	const activateCommands = computed<CommandBarItem[]>(() =>
		workflowsStore.isWorkflowActive
			? [
					{
						id: ITEM_ID.DEACTIVATE_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.deactivate'),
						section: i18n.baseText('commandBar.sections.workflow'),
						handler: () => {
							void workflowActivate.updateWorkflowActivation(workflowsStore.workflowId, false);
						},
						icon: {
							component: N8nIcon as Component,
							props: {
								icon: 'power-off',
							},
						},
					},
				]
			: [
					{
						id: ITEM_ID.ACTIVATE_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.activate'),
						section: i18n.baseText('commandBar.sections.workflow'),
						handler: () => {
							void workflowActivate.updateWorkflowActivation(workflowsStore.workflowId, true);
						},
						icon: {
							component: N8nIcon as Component,
							props: {
								icon: 'power',
							},
						},
					},
				],
	);

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
				id: ITEM_ID.OPEN_SUB_WORKFLOW,
				title: i18n.baseText('commandBar.workflow.openSubworkflow'),
				section: i18n.baseText('commandBar.sections.workflow'),
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
				icon: {
					component: N8nIcon as Component,
					props: {
						icon: 'sign-in-alt',
					},
				},
			},
		];
	});

	const exportCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: ITEM_ID.DOWNLOAD_WORKFLOW,
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
				icon: {
					component: N8nIcon as Component,
					props: {
						icon: 'download',
					},
				},
				keywords: [
					i18n.baseText('commandBar.workflow.keywords.download'),
					i18n.baseText('commandBar.workflow.keywords.export'),
				],
			},
		];
	});

	const importCommands = computed<CommandBarItem[]>(() => {
		return [
			{
				id: ITEM_ID.IMPORT_WORKFLOW_FROM_URL,
				title: i18n.baseText('commandBar.workflow.importFromURL'),
				section: i18n.baseText('commandBar.sections.workflow'),
				icon: {
					component: N8nIcon as Component,
					props: {
						icon: 'link',
					},
				},
				handler: () => {
					uiStore.openModal(IMPORT_WORKFLOW_URL_MODAL_KEY);
				},
			},
			{
				id: ITEM_ID.IMPORT_WORKFLOW_FROM_FILE,
				title: i18n.baseText('commandBar.workflow.importFromFile'),
				section: i18n.baseText('commandBar.sections.workflow'),
				icon: {
					component: N8nIcon as Component,
					props: {
						icon: 'link',
					},
				},
				handler: () => {
					nodeViewEventBus.emit('importWorkflowFromFile');
				},
			},
		];
	});

	const lifecycleCommands = computed<CommandBarItem[]>(() => {
		return !workflowsStore.workflow.isArchived
			? [
					{
						id: ITEM_ID.ARCHIVE_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.archive'),
						section: i18n.baseText('commandBar.sections.workflow'),
						keywords: [
							i18n.baseText('commandBar.workflow.keywords.archive'),
							i18n.baseText('commandBar.workflow.keywords.delete'),
						],
						icon: {
							component: N8nIcon as Component,
							props: {
								icon: 'trash',
							},
						},
						handler: () => {
							nodeViewEventBus.emit('archiveWorkflow');
						},
					},
				]
			: [
					{
						id: ITEM_ID.UNARCHIVE_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.unarchive'),
						section: i18n.baseText('commandBar.sections.workflow'),
						keywords: [
							i18n.baseText('commandBar.workflow.keywords.unarchive'),
							i18n.baseText('commandBar.workflow.keywords.restore'),
						],
						icon: {
							component: N8nIcon as Component,
							props: {
								icon: 'archive-restore',
							},
						},
						handler: () => {
							nodeViewEventBus.emit('unarchiveWorkflow');
						},
					},
					{
						id: ITEM_ID.DELETE_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.delete'),
						section: i18n.baseText('commandBar.sections.workflow'),
						icon: {
							component: N8nIcon as Component,
							props: {
								icon: 'trash',
							},
						},
						handler: () => {
							nodeViewEventBus.emit('deleteWorkflow');
						},
					},
				];
	});

	const workflowCommands = computed<CommandBarItem[]>(() => {
		return [
			...canvasActions.value,
			...activateCommands.value,
			...subworkflowCommands.value,
			...exportCommands.value,
			...importCommands.value,
			...lifecycleCommands.value,
		];
	});

	const allCommands = computed(() => [...workflowCommands.value, ...credentialCommands.value]);

	return {
		commands: allCommands,
	};
}
