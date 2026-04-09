import type { BundleWorkflow, ImportBundleResult, WorkflowBundle } from '@n8n/api-types';
import { deepCopy, type INode } from 'n8n-workflow';
import { generateNanoId } from '@n8n/utils';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { createDataTableApi } from '@/features/core/dataTable/dataTable.api';
import { VIEWS, EXECUTE_WORKFLOW_NODE_TYPE, DATA_TABLE_NODES } from '@/app/constants';
import { telemetry } from '@/app/plugins/telemetry';
import router from '@/app/router';
import type { INodeUi } from '@/Interface';

// ── Node reference extraction helpers ──────────────────────────────

/**
 * Extract the sub-workflow ID from an Execute Workflow node's parameters.
 * Returns undefined for non-database sources (parameter, localFile, url)
 * or if the ID cannot be statically determined.
 */
export function getWorkflowIdFromNode(node: {
	type: string;
	parameters?: Record<string, unknown>;
}): string | undefined {
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE) return undefined;
	const source = node.parameters?.source;
	if (source === 'parameter' || source === 'localFile' || source === 'url') return undefined;
	const wfId = node.parameters?.workflowId;
	if (typeof wfId === 'string') return wfId;
	if (
		wfId &&
		typeof wfId === 'object' &&
		'value' in wfId &&
		typeof (wfId as { value: unknown }).value === 'string'
	) {
		return (wfId as { value: string }).value;
	}
	return undefined;
}

/**
 * Extract the data table ID from a data table node's parameters.
 * Returns undefined if the ID is missing or contains expressions.
 */
export function getDataTableIdFromNode(node: {
	type: string;
	parameters?: Record<string, unknown>;
}): string | undefined {
	if (!DATA_TABLE_NODES.includes(node.type)) return undefined;
	const dtId = node.parameters?.dataTableId as { value?: string } | undefined;
	if (!dtId?.value || typeof dtId.value !== 'string') return undefined;
	if (dtId.value.includes('{')) return undefined;
	return dtId.value;
}

// ── Reference remapping helpers ────────────────────────────────────

function remapSubWorkflowReference(node: INode, idMap: Record<string, string>): void {
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE || !node.parameters) return;
	const wfId = node.parameters.workflowId;
	if (typeof wfId === 'string' && idMap[wfId]) {
		node.parameters.workflowId = idMap[wfId];
	} else if (
		wfId &&
		typeof wfId === 'object' &&
		'value' in wfId &&
		typeof (wfId as { value: unknown }).value === 'string' &&
		idMap[(wfId as { value: string }).value]
	) {
		(wfId as { value: string }).value = idMap[(wfId as { value: string }).value];
	}
}

function remapDataTableReference(node: INode, idMap: Record<string, string>): void {
	if (!DATA_TABLE_NODES.includes(node.type) || !node.parameters) return;
	const dtId = node.parameters.dataTableId as { value?: string } | undefined;
	if (dtId?.value && typeof dtId.value === 'string' && idMap[dtId.value]) {
		dtId.value = idMap[dtId.value];
	}
}

// ── Topological sort ───────────────────────────────────────────────

/**
 * Topological sort producing leaf-first ordering (dependencies before dependents).
 * `edges[A] = [B, C]` means A depends on (calls) B and C.
 * Handles cycles by appending remaining nodes at the end.
 */
function topologicalSortLeafFirst(nodeIds: Set<string>, edges: Record<string, string[]>): string[] {
	// Build in-degree: how many nodes depend on each node
	const inDegree: Record<string, number> = {};
	for (const id of nodeIds) inDegree[id] = 0;
	for (const [, deps] of Object.entries(edges)) {
		for (const dep of deps) {
			if (nodeIds.has(dep)) {
				inDegree[dep] = (inDegree[dep] ?? 0) + 1;
			}
		}
	}

	// Start with nodes nobody depends on (top-level callers)
	const queue: string[] = [];
	for (const [id, degree] of Object.entries(inDegree)) {
		if (degree === 0) queue.push(id);
	}

	const sorted: string[] = [];
	while (queue.length > 0) {
		const current = queue.shift()!;
		sorted.push(current);
		for (const dep of edges[current] ?? []) {
			if (!nodeIds.has(dep)) continue;
			inDegree[dep]--;
			if (inDegree[dep] === 0) queue.push(dep);
		}
	}

	// Append any remaining (cyclic) nodes
	for (const id of nodeIds) {
		if (!sorted.includes(id)) sorted.push(id);
	}

	// Reverse: we want leaves (dependencies) first, callers last
	sorted.reverse();
	return sorted;
}

// ── Composable ─────────────────────────────────────────────────────

export function useBundleImport() {
	const toast = useToast();
	const locale = useI18n();
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();

	function getProjectId(projectId?: string): string {
		return projectId ?? projectsStore.currentProjectId ?? projectsStore.personalProject?.id ?? '';
	}

	/**
	 * Filter a bundle to only include sub-workflows and data tables
	 * transitively referenced by the given nodes.
	 * Walks into discovered sub-workflows to collect their dependencies too.
	 */
	function filterBundleToNodes(bundle: WorkflowBundle, nodes: INode[]): WorkflowBundle {
		const referencedWorkflowIds = new Set<string>();
		const referencedDataTableIds = new Set<string>();

		function collectRefsFromNodes(nodeList: INode[]) {
			for (const node of nodeList) {
				const dtId = getDataTableIdFromNode(node);
				if (dtId) referencedDataTableIds.add(dtId);

				const wfId = getWorkflowIdFromNode(node);
				if (wfId && !referencedWorkflowIds.has(wfId)) {
					referencedWorkflowIds.add(wfId);
					// Recurse into the sub-workflow if it's in the bundle
					const subWf = bundle.subWorkflows[wfId];
					if (subWf) {
						collectRefsFromNodes(subWf.nodes);
					}
				}
			}
		}

		collectRefsFromNodes(nodes);

		return {
			...bundle,
			subWorkflows: Object.fromEntries(
				Object.entries(bundle.subWorkflows).filter(([id]) => referencedWorkflowIds.has(id)),
			),
			dataTableSchemas: bundle.dataTableSchemas.filter((s) =>
				referencedDataTableIds.has(s.originalId),
			),
		};
	}

	/**
	 * Fetch the bundle for a workflow from the backend.
	 * Call this eagerly so the data is ready when the user decides to include resources.
	 */
	async function fetchWorkflowBundle(workflowId: string): Promise<WorkflowBundle> {
		return await makeRestApiRequest<WorkflowBundle>(
			rootStore.restApiContext,
			'POST',
			'/workflow-bundles/export',
			{ workflowId },
		);
	}

	/**
	 * Build a scoped bundle from a pre-fetched bundle, replacing the main workflow
	 * with only the copied selection and filtering resources to those referenced
	 * by the selected nodes. Writes the result to the clipboard.
	 */
	async function writeScopedBundleToClipboard(
		bundle: WorkflowBundle,
		scopeToNodes: INode[],
		mainWorkflowOverride: BundleWorkflow,
	): Promise<void> {
		let scoped = filterBundleToNodes(bundle, scopeToNodes);
		scoped = { ...scoped, mainWorkflow: mainWorkflowOverride };

		await navigator.clipboard.writeText(JSON.stringify(scoped));

		const subWorkflowCount = Object.keys(scoped.subWorkflows).length;
		const dataTableCount = scoped.dataTableSchemas.length;

		toast.showMessage({
			title: locale.baseText('workflowBundle.copy.success', {
				interpolate: {
					subWorkflows: String(subWorkflowCount),
					dataTables: String(dataTableCount),
				},
			}),
			type: 'success',
		});

		telemetry.track('User copied workflow bundle', { workflow_id: bundle.mainWorkflow.id });
	}

	/**
	 * Export a workflow as a bundle and copy to clipboard.
	 * Shows a notification with the count of bundled sub-workflows and data tables.
	 */
	async function copyBundleToClipboard(workflowId: string): Promise<WorkflowBundle | undefined> {
		try {
			const bundle = await fetchWorkflowBundle(workflowId);

			await navigator.clipboard.writeText(JSON.stringify(bundle));

			const subWorkflowCount = Object.keys(bundle.subWorkflows).length;
			const dataTableCount = bundle.dataTableSchemas.length;

			toast.showMessage({
				title: locale.baseText('workflowBundle.copy.success', {
					interpolate: {
						subWorkflows: String(subWorkflowCount),
						dataTables: String(dataTableCount),
					},
				}),
				type: 'success',
			});

			telemetry.track('User copied workflow bundle', { workflow_id: workflowId });

			return bundle;
		} catch (error) {
			toast.showError(error, locale.baseText('workflowBundle.copy.error'));
			return undefined;
		}
	}

	/**
	 * Import only the main workflow from a bundle (no sub-workflows or data tables).
	 * Returns a stripped bundle suitable for the import endpoint.
	 */
	function stripBundleResources(bundle: WorkflowBundle): WorkflowBundle {
		return {
			...bundle,
			subWorkflows: {},
			dataTableSchemas: [],
		};
	}

	/**
	 * Paste a workflow bundle from clipboard.
	 * Imports the main workflow immediately, then offers to create sub-workflows
	 * and data tables via a notification action.
	 */
	async function pasteBundleFromClipboard(
		bundle: WorkflowBundle,
		projectId?: string,
	): Promise<void> {
		const effectiveProjectId = getProjectId(projectId);
		const subWorkflowCount = Object.keys(bundle.subWorkflows).length;
		const dataTableCount = bundle.dataTableSchemas.length;
		const hasResources = subWorkflowCount > 0 || dataTableCount > 0;

		try {
			if (!hasResources) {
				// No sub-resources — import everything in one go
				const result = await makeRestApiRequest<ImportBundleResult>(
					rootStore.restApiContext,
					'POST',
					'/workflow-bundles/import',
					{ bundle, projectId: effectiveProjectId },
				);

				await navigateToWorkflow(result.mainWorkflowId);
				showImportWarnings(result.warnings);

				toast.showMessage({
					title: locale.baseText('workflowBundle.paste.success'),
					type: 'success',
				});
			} else {
				// Has sub-resources — import main workflow first, offer to create the rest
				const strippedBundle = stripBundleResources(bundle);
				const result = await makeRestApiRequest<ImportBundleResult>(
					rootStore.restApiContext,
					'POST',
					'/workflow-bundles/import',
					{ bundle: strippedBundle, projectId: effectiveProjectId },
				);

				await navigateToWorkflow(result.mainWorkflowId);

				toast.showToast({
					title: locale.baseText('workflowBundle.paste.success'),
					message: locale.baseText('workflowBundle.paste.offerResources', {
						interpolate: {
							subWorkflows: String(subWorkflowCount),
							dataTables: String(dataTableCount),
						},
					}),
					type: 'success',
					duration: 0,
					onClick: () => {
						void importBundleResources(bundle, effectiveProjectId, result.mainWorkflowId);
					},
					closeOnClick: true,
				});
			}

			telemetry.track('User pasted workflow bundle', {
				workflow_id: bundle.mainWorkflow.id,
			});
		} catch (error) {
			toast.showError(error, locale.baseText('workflowBundle.paste.error'));
		}
	}

	/**
	 * Import sub-workflows and data tables for an already-created main workflow
	 * via the backend bundle import endpoint.
	 */
	async function importBundleResources(
		bundle: WorkflowBundle,
		projectId: string,
		mainWorkflowId: string,
	): Promise<void> {
		try {
			const result = await makeRestApiRequest<ImportBundleResult>(
				rootStore.restApiContext,
				'POST',
				'/workflow-bundles/import',
				{ bundle, projectId, mainWorkflowId },
			);

			showImportWarnings(result.warnings);

			toast.showMessage({
				title: locale.baseText('workflowBundle.paste.resourcesCreated', {
					interpolate: {
						subWorkflows: String(Object.keys(bundle.subWorkflows).length),
						dataTables: String(bundle.dataTableSchemas.length),
					},
				}),
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, locale.baseText('workflowBundle.paste.error'));
		}
	}

	/**
	 * Frontend-driven import of bundle resources onto the canvas.
	 * Creates data tables and sub-workflows individually, then updates
	 * the already-pasted canvas nodes to reference the new resource IDs.
	 */
	async function importBundleResourcesOnCanvas(
		bundle: WorkflowBundle,
		projectId: string,
		pastedNodes: INode[],
		callbacks: {
			getNodeById: (id: string) => INodeUi | undefined;
			setNodeParameters: (id: string, params: Record<string, unknown>) => void;
		},
	): Promise<void> {
		const warnings: string[] = [];

		// Phase 1: Create data tables and collect ID mapping
		const dataTableIdMap: Record<string, string> = {};
		for (const schema of bundle.dataTableSchemas) {
			try {
				const columns = schema.columns.map((col) => ({ name: col.name, type: col.type }));
				const created = await createDataTableApi(
					rootStore.restApiContext,
					schema.name,
					projectId,
					columns,
				);
				dataTableIdMap[schema.originalId] = created.id;
			} catch (error) {
				warnings.push(
					`Failed to create data table "${schema.name}": ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Phase 2: Pre-generate sub-workflow IDs and build dependency graph
		const bundleWorkflowIds = new Set(Object.keys(bundle.subWorkflows));
		const workflowIdMap: Record<string, string> = {};
		for (const originalId of bundleWorkflowIds) {
			workflowIdMap[originalId] = generateNanoId();
		}

		const edges: Record<string, string[]> = {};
		for (const [originalId, subWorkflow] of Object.entries(bundle.subWorkflows)) {
			edges[originalId] = [];
			for (const node of subWorkflow.nodes) {
				const refId = getWorkflowIdFromNode(node);
				if (refId && bundleWorkflowIds.has(refId)) {
					edges[originalId].push(refId);
				}
			}
		}

		const creationOrder = topologicalSortLeafFirst(bundleWorkflowIds, edges);

		// Phase 3: Create sub-workflows leaf-first with pre-generated IDs
		for (const originalId of creationOrder) {
			const subWorkflow = bundle.subWorkflows[originalId];
			if (!subWorkflow) continue;

			try {
				// Deep clone nodes to avoid mutating the original bundle
				const clonedNodes: INode[] = deepCopy(subWorkflow.nodes);
				for (const node of clonedNodes) {
					remapSubWorkflowReference(node, workflowIdMap);
					remapDataTableReference(node, dataTableIdMap);
				}

				await makeRestApiRequest(rootStore.restApiContext, 'POST', '/workflows', {
					id: workflowIdMap[originalId],
					name: subWorkflow.name,
					nodes: clonedNodes,
					connections: subWorkflow.connections,
					settings: subWorkflow.settings ?? {},
					pinData: subWorkflow.pinData ?? {},
					projectId,
					active: false,
				});
			} catch (error) {
				warnings.push(
					`Failed to create sub-workflow "${subWorkflow.name}": ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Phase 4: Update pasted canvas nodes to reference new IDs
		for (const pastedNode of pastedNodes) {
			if (!pastedNode.id) continue;
			const currentNode = callbacks.getNodeById(pastedNode.id);
			if (!currentNode) continue;

			// Update sub-workflow references
			if (currentNode.type === EXECUTE_WORKFLOW_NODE_TYPE) {
				const currentRefId = getWorkflowIdFromNode(currentNode);
				if (currentRefId && workflowIdMap[currentRefId]) {
					const wfParam = currentNode.parameters?.workflowId;
					if (typeof wfParam === 'string') {
						callbacks.setNodeParameters(pastedNode.id, {
							workflowId: workflowIdMap[currentRefId],
						});
					} else if (wfParam && typeof wfParam === 'object') {
						callbacks.setNodeParameters(pastedNode.id, {
							workflowId: { ...(wfParam as object), value: workflowIdMap[currentRefId] },
						});
					}
				}
			}

			// Update data table references
			if (DATA_TABLE_NODES.includes(currentNode.type)) {
				const currentDtId = getDataTableIdFromNode(currentNode);
				if (currentDtId && dataTableIdMap[currentDtId]) {
					const dtParam = currentNode.parameters?.dataTableId;
					callbacks.setNodeParameters(pastedNode.id, {
						dataTableId: { ...(dtParam as object), value: dataTableIdMap[currentDtId] },
					});
				}
			}
		}

		// Phase 5: Show results
		if (warnings.length > 0) {
			showImportWarnings(warnings);
		}

		toast.showMessage({
			title: locale.baseText('workflowBundle.paste.resourcesCreated', {
				interpolate: {
					subWorkflows: String(Object.keys(bundle.subWorkflows).length),
					dataTables: String(bundle.dataTableSchemas.length),
				},
			}),
			type: 'success',
		});

		telemetry.track('User imported bundle resources on canvas', {
			sub_workflow_count: Object.keys(bundle.subWorkflows).length,
			data_table_count: bundle.dataTableSchemas.length,
			warning_count: warnings.length,
		});
	}

	function showImportWarnings(warnings: string[]) {
		if (warnings.length > 0) {
			toast.showMessage({
				title: locale.baseText('workflowBundle.paste.warnings'),
				message: warnings.join('\n'),
				type: 'warning',
			});
		}
	}

	async function navigateToWorkflow(workflowId: string) {
		await router.push({
			name: VIEWS.WORKFLOW,
			params: { name: workflowId },
		});
	}

	/**
	 * Check if a string is a serialized workflow bundle.
	 */
	function isBundleData(data: string): boolean {
		try {
			const parsed = JSON.parse(data) as Record<string, unknown>;
			return parsed.bundleVersion === 1 && 'mainWorkflow' in parsed;
		} catch {
			return false;
		}
	}

	/**
	 * Parse a string as a WorkflowBundle. Returns undefined if invalid.
	 */
	function parseBundleData(data: string): WorkflowBundle | undefined {
		try {
			const parsed = JSON.parse(data) as WorkflowBundle;
			if (parsed.bundleVersion !== 1 || !parsed.mainWorkflow) return undefined;
			return parsed;
		} catch {
			return undefined;
		}
	}

	return {
		getWorkflowIdFromNode,
		getDataTableIdFromNode,
		filterBundleToNodes,
		fetchWorkflowBundle,
		writeScopedBundleToClipboard,
		copyBundleToClipboard,
		pasteBundleFromClipboard,
		importBundleResources,
		importBundleResourcesOnCanvas,
		isBundleData,
		parseBundleData,
	};
}
