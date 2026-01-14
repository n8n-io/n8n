import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { saveAs } from 'file-saver';
import type { IWorkflowToShare } from '@/Interface';
import axios from 'axios';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';

export interface DataTableReference {
	id: string;
	name: string;
	mode: 'list' | 'id' | 'name';
}

export interface SubworkflowReference {
	id: string;
	name: string;
}

export function useWorkflowExport() {
	const workflowsStore = useWorkflowsStore();
	const rootStore = useRootStore();
	const tagsStore = useTagsStore();
	const workflowHelpers = useWorkflowHelpers();
	const telemetry = useTelemetry();
	const toast = useToast();

	/**
	 * Extract data table references from workflow nodes
	 */
	function extractDataTablesFromWorkflow(): DataTableReference[] {
		const workflow = workflowsStore.workflow;
		const dataTableNodes = workflow.nodes.filter(
			(node) => node.type === 'n8n-nodes-base.dataTable',
		);

		const tableIds = new Set<string>();
		const tableReferences: DataTableReference[] = [];

		for (const node of dataTableNodes) {
			const dataTableId = node.parameters?.dataTableId;
			if (dataTableId && typeof dataTableId === 'object') {
				const { mode, value, cachedResultName } = dataTableId as {
					mode: 'list' | 'id' | 'name';
					value: string;
					cachedResultName?: string;
				};

				if (value && !tableIds.has(value)) {
					tableIds.add(value);
					tableReferences.push({
						id: value,
						name: cachedResultName || value,
						mode,
					});
				}
			}
		}

		return tableReferences;
	}

	/**
	 * Extract subworkflow references from Execute Workflow nodes
	 */
	function extractSubworkflowsFromWorkflow(): SubworkflowReference[] {
		const workflow = workflowsStore.workflow;
		const executeWorkflowNodes = workflow.nodes.filter(
			(node) => node.type === 'n8n-nodes-base.executeWorkflow',
		);

		const subworkflowIds = new Set<string>();
		const subworkflowReferences: SubworkflowReference[] = [];

		for (const node of executeWorkflowNodes) {
			// Skip non-database sources
			const source = node.parameters?.source;
			if (source === 'parameter' || source === 'localFile' || source === 'url') {
				continue;
			}

			const workflowId = node.parameters?.workflowId;
			let id: string | undefined;
			let name: string | undefined;

			// Handle string format (v1.0)
			if (typeof workflowId === 'string') {
				id = workflowId;
			}
			// Handle object format (v1.1+)
			else if (workflowId && typeof workflowId === 'object') {
				const workflowIdObj = workflowId as {
					value?: string;
					cachedResultName?: string;
				};
				id = workflowIdObj.value;
				name = workflowIdObj.cachedResultName;
			}

			if (id && !subworkflowIds.has(id)) {
				subworkflowIds.add(id);
				subworkflowReferences.push({
					id,
					name: name || id,
				});
			}
		}

		return subworkflowReferences;
	}

	/**
	 * Export workflow as JSON file
	 */
	async function exportWorkflowAsJson() {
		const workflowData = await workflowHelpers.getWorkflowDataToSave();
		const { tags, ...data } = workflowData;

		const exportData: IWorkflowToShare = {
			...data,
			meta: {
				...workflowData.meta,
				instanceId: rootStore.instanceId,
			},
			tags: (tags ?? []).map((tagId) => tagsStore.tagsById[tagId]),
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: 'application/json;charset=utf-8',
		});

		let name = workflowsStore.workflow.name || 'unsaved_workflow';
		name = name.replace(/[^a-z0-9]/gi, '_');

		telemetry.track('User exported workflow', {
			workflow_id: workflowData.id,
			include_data_tables: false,
		});

		saveAs(blob, `${name}.json`);
	}

	/**
	 * Export workflow with data tables and/or subworkflows as ZIP file
	 */
	async function exportWorkflowWithDataTables(
		includeDataTables: boolean = true,
		includeSubworkflows: boolean = false,
	) {
		const workflowId = workflowsStore.workflowId;

		if (!workflowId) {
			toast.showError(new Error('Cannot export unsaved workflow'), 'Export failed');
			return;
		}

		try {
			telemetry.track('User exported workflow', {
				workflow_id: workflowId,
				include_data_tables: includeDataTables,
				include_subworkflows: includeSubworkflows,
			});

			// Get browser ID from localStorage for authentication
			let browserId = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
			if (!browserId) {
				browserId = crypto.randomUUID();
				localStorage.setItem(BROWSER_ID_STORAGE_KEY, browserId);
			}

			// Use axios with blob response type and proper authentication headers
			const response = await axios.get(
				`${rootStore.restApiContext.baseUrl}/workflows/${workflowId}/export`,
				{
					params: {
						includeDataTables,
						includeSubworkflows,
					},
					headers: {
						'browser-id': browserId,
						'push-ref': rootStore.restApiContext.pushRef,
					},
					responseType: 'blob',
					withCredentials: true,
				},
			);

			// Get the blob and trigger download
			const blob = response.data;
			let name = workflowsStore.workflow.name || 'workflow';
			name = name.replace(/[^a-z0-9]/gi, '_');
			saveAs(blob, `${name}.zip`);
		} catch (error) {
			toast.showError(error as Error, 'Failed to export workflow');

			// Offer fallback to JSON export
			const shouldFallback = confirm(
				'Export failed. Would you like to export as JSON without data tables or subworkflows?',
			);

			if (shouldFallback) {
				await exportWorkflowAsJson();
			}
		}
	}

	return {
		extractDataTablesFromWorkflow,
		extractSubworkflowsFromWorkflow,
		exportWorkflowAsJson,
		exportWorkflowWithDataTables,
	};
}
