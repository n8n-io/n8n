import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { isResourceLocatorValue } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import {
	DUPLICATE_MODAL_KEY,
	EXECUTE_WORKFLOW_NODE_TYPE,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	VIEWS,
	WORKFLOW_SETTINGS_MODAL_KEY,
} from '@/app/constants';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import type { IWorkflowToShare } from '@/Interface';
import { saveAs } from 'file-saver';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import type { CommandGroup, CommandBarItem } from '../types';
import uniqBy from 'lodash/uniqBy';
import { nodeViewEventBus } from '@/app/event-bus';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';

const ITEM_ID = {
	OPEN_CREDENTIAL: 'open-credential',
	OPEN_SUB_WORKFLOW: 'open-sub-workflow',
	TEST_WORKFLOW: 'test-workflow',
	SAVE_WORKFLOW: 'save-workflow',
	ACTIVATE_WORKFLOW: 'activate-workflow',
	DEACTIVATE_WORKFLOW: 'deactivate-workflow',
	SELECT_ALL: 'select-all',
	OPEN_WORKFLOW_SETTINGS: 'open-workflow-settings',
	TIDY_UP_WORKFLOW: 'tidy-up-workflow',
	RENAME_WORKFLOW: 'rename-workflow',
	ADD_TAG: 'add-tag',
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
	const sourceControlStore = useSourceControlStore();

	const router = useRouter();

	const runWorkflow = useRunWorkflow({ router });

	const workflowHelpers = useWorkflowHelpers();
	const telemetry = useTelemetry();
	const workflowSaving = useWorkflowSaving({ router });
	const workflowActivate = useWorkflowActivate();

	const isReadOnly = computed(() => sourceControlStore.preferences.branchReadOnly);
	const isWorkflowSaving = computed(() => uiStore.isActionActive.workflowSaving);
	const isArchived = computed(() => workflowsStore.workflow.isArchived);

	const workflowPermissions = computed(
		() => getResourcePermissions(workflowsStore.workflow.scopes).workflow,
	);

	const hasPermission = (permission: keyof typeof workflowPermissions.value) =>
		(workflowPermissions.value[permission] === true && !isReadOnly.value) ||
		workflowsStore.isNewWorkflow;

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
					component: N8nIcon,
					props: {
						icon: 'arrow-right',
					},
				},
			},
		];
	});

	const canvasActions = computed<CommandBarItem[]>(() => [
		...(hasPermission('update') && !isArchived.value
			? [
					...(!isWorkflowSaving.value
						? [
								{
									id: ITEM_ID.SAVE_WORKFLOW,
									title: {
										component: CommandBarItemTitle,
										props: {
											title: i18n.baseText('commandBar.workflow.save'),
											shortcut: {
												metaKey: true,
												keys: ['s'],
											},
										},
									},
									keywords: [i18n.baseText('commandBar.workflow.save')],
									section: i18n.baseText('commandBar.sections.workflow'),
									handler: async () => {
										const saved = await workflowSaving.saveCurrentWorkflow();
										if (saved) {
											canvasEventBus.emit('saved:workflow');
										}
									},
									icon: {
										component: N8nIcon,
										props: {
											icon: 'save',
										},
									},
								},
							]
						: []),
					{
						id: ITEM_ID.TEST_WORKFLOW,
						title: {
							component: CommandBarItemTitle,
							props: {
								title: i18n.baseText('commandBar.workflow.test'),
								shortcut: {
									metaKey: true,
									keys: ['enter'],
								},
							},
						},
						section: i18n.baseText('commandBar.sections.workflow'),
						keywords: [
							i18n.baseText('commandBar.workflow.test'),
							i18n.baseText('commandBar.workflow.keywords.test'),
							i18n.baseText('commandBar.workflow.keywords.execute'),
							i18n.baseText('commandBar.workflow.keywords.run'),
							i18n.baseText('commandBar.workflow.keywords.workflow'),
						],
						handler: () => {
							void runWorkflow.runEntireWorkflow('main');
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'flask-conical',
							},
						},
					},
					{
						id: ITEM_ID.TIDY_UP_WORKFLOW,
						title: {
							component: CommandBarItemTitle,
							props: {
								title: i18n.baseText('commandBar.workflow.tidyUp'),
								shortcut: {
									shiftKey: true,
									altKey: true,
									keys: ['t'],
								},
							},
						},
						keywords: [i18n.baseText('commandBar.workflow.tidyUp')],
						section: i18n.baseText('commandBar.sections.workflow'),
						handler: () => {
							canvasEventBus.emit('tidyUp', {
								source: 'command-bar',
							});
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'wand-sparkles',
							},
						},
					},
					{
						id: ITEM_ID.RENAME_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.rename'),
						section: i18n.baseText('commandBar.sections.workflow'),
						handler: () => {
							nodeViewEventBus.emit('renameWorkflow');
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'pencil-alt',
							},
						},
					},
					{
						id: ITEM_ID.ADD_TAG,
						title: i18n.baseText('workflowDetails.addTag'),
						section: i18n.baseText('commandBar.sections.workflow'),
						handler: () => {
							nodeViewEventBus.emit('addTag');
						},
						icon: {
							component: N8nIcon,
							props: {
								icon: 'tags',
							},
						},
					},
				]
			: []),
		{
			id: ITEM_ID.SELECT_ALL,
			title: {
				component: CommandBarItemTitle,
				props: {
					title: i18n.baseText('commandBar.workflow.selectAll'),
					shortcut: {
						metaKey: true,
						keys: ['a'],
					},
				},
			},
			section: i18n.baseText('commandBar.sections.workflow'),
			keywords: [i18n.baseText('commandBar.workflow.selectAll')],
			handler: () => {
				canvasEventBus.emit('nodes:selectAll');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'list-checks',
				},
			},
		},
		{
			id: ITEM_ID.OPEN_WORKFLOW_SETTINGS,
			title: i18n.baseText('commandBar.workflow.openSettings'),
			section: i18n.baseText('commandBar.sections.workflow'),
			handler: () => {
				uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'cog',
				},
			},
		},
		...(hasPermission('create')
			? [
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
							component: N8nIcon,
							props: {
								icon: 'copy',
							},
						},
					},
				]
			: []),
	]);

	const activateCommands = computed<CommandBarItem[]>(() => {
		if (!hasPermission('update') || isArchived.value) return [];

		return workflowsStore.isWorkflowActive
			? [
					{
						id: ITEM_ID.DEACTIVATE_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.deactivate'),
						section: i18n.baseText('commandBar.sections.workflow'),
						handler: () => {
							void workflowActivate.updateWorkflowActivation(workflowsStore.workflowId, false);
						},
						icon: {
							component: N8nIcon,
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
							component: N8nIcon,
							props: {
								icon: 'power',
							},
						},
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
					component: N8nIcon,
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
					component: N8nIcon,
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
					component: N8nIcon,
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
					component: N8nIcon,
					props: {
						icon: 'file-import',
					},
				},
				handler: () => {
					nodeViewEventBus.emit('importWorkflowFromFile');
				},
			},
		];
	});

	const lifecycleCommands = computed<CommandBarItem[]>(() => {
		if (!hasPermission('delete')) return [];

		return !isArchived.value
			? [
					{
						id: ITEM_ID.ARCHIVE_WORKFLOW,
						title: i18n.baseText('commandBar.workflow.archive'),
						section: i18n.baseText('commandBar.sections.workflow'),
						keywords: [i18n.baseText('commandBar.workflow.keywords.delete')],
						icon: {
							component: N8nIcon,
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
						keywords: [i18n.baseText('commandBar.workflow.keywords.restore')],
						icon: {
							component: N8nIcon,
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
							component: N8nIcon,
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
