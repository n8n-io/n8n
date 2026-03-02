import { nextTick, type ShallowRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ExecutionStatus, ExecutionSummary } from 'n8n-workflow';
import { useToast } from '@/app/composables/useToast';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useCanvasStore } from '@/app/stores/canvas.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { buildExecutionResponseFromSchema } from '@/features/execution/executions/executions.utils';
import type { ExecutionPreviewNodeSchema } from '@/features/execution/executions/executions.types';
import type { IWorkflowDb } from '@/Interface';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowImport } from '@/app/composables/useWorkflowImport';

interface PostMessageHandlerDeps {
	workflowState: WorkflowState;
	currentWorkflowDocumentStore: ShallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>;
}

export function usePostMessageHandler({
	workflowState,
	currentWorkflowDocumentStore,
}: PostMessageHandlerDeps) {
	const i18n = useI18n();
	const toast = useToast();
	const canvasStore = useCanvasStore();
	const projectsStore = useProjectsStore();
	const executionsStore = useExecutionsStore();
	const rootStore = useRootStore();
	const externalHooks = useExternalHooks();
	const telemetry = useTelemetry();
	const nodeHelpers = useNodeHelpers();

	const { resetWorkspace, openExecution, fitView } = useCanvasOperations();
	const { importWorkflowExact } = useWorkflowImport(currentWorkflowDocumentStore);

	function emitPostMessageReady() {
		if (window.parent) {
			window.parent.postMessage(
				JSON.stringify({ command: 'n8nReady', version: rootStore.versionCli }),
				'*',
			);
		}
	}

	function reportErrorToParent(message: string) {
		if (window.top) {
			window.top.postMessage(JSON.stringify({ command: 'error', message }), '*');
		}
	}

	async function handleOpenWorkflow(json: {
		workflow: WorkflowDataUpdate;
		projectId?: string;
		tidyUp?: boolean;
	}) {
		if (json.projectId) {
			await projectsStore.fetchAndSetProject(json.projectId);
		}
		await importWorkflowExact(json);

		if (json.tidyUp === true) {
			canvasEventBus.emit('tidyUp', { source: 'import-workflow-data' });
		}
	}

	async function handleOpenExecution(json: {
		executionId: string;
		executionMode?: string;
		nodeId?: string;
		projectId?: string;
	}) {
		if (json.projectId) {
			await projectsStore.fetchAndSetProject(json.projectId);
		}

		nodeHelpers.isProductionExecutionPreview.value =
			json.executionMode !== 'manual' && json.executionMode !== 'evaluation';

		canvasStore.startLoading();
		resetWorkspace();

		const data = await openExecution(json.executionId, json.nodeId);
		if (!data) {
			return;
		}

		void nextTick(() => {
			nodeHelpers.updateNodesInputIssues();
			nodeHelpers.updateNodesCredentialsIssues();
		});

		canvasStore.stopLoading();
		fitView();

		canvasEventBus.emit('open:execution', data);

		void externalHooks.run('execution.open', {
			workflowId: data.workflowData.id,
			workflowName: data.workflowData.name,
			executionId: json.executionId,
		});

		telemetry.track('User opened read-only execution', {
			workflow_id: data.workflowData.id,
			execution_mode: data.mode,
			execution_finished: data.finished,
		});
	}

	async function handleOpenExecutionPreview(json: {
		workflow: IWorkflowDb;
		nodeExecutionSchema: Record<string, ExecutionPreviewNodeSchema>;
		executionStatus: ExecutionStatus;
		executionError?: { message: string; description?: string; name?: string; stack?: string };
		lastNodeExecuted?: string;
		projectId?: string;
	}) {
		canvasStore.startLoading();

		const workflow = json.workflow;
		if (!workflow?.nodes || !workflow?.connections) {
			canvasStore.stopLoading();
			throw new Error('Invalid workflow object');
		}

		if (json.projectId) {
			await projectsStore.fetchAndSetProject(json.projectId);
		}

		const data = buildExecutionResponseFromSchema({
			workflow,
			nodeExecutionSchema: json.nodeExecutionSchema,
			executionStatus: json.executionStatus,
			executionError: json.executionError,
			lastNodeExecuted: json.lastNodeExecuted,
		});

		await importWorkflowExact(json);

		workflowState.setWorkflowExecutionData(data);
		currentWorkflowDocumentStore.value?.setPinData({});

		canvasStore.stopLoading();

		canvasEventBus.emit('open:execution', data);
	}

	async function onPostMessageReceived(messageEvent: MessageEvent) {
		if (
			!messageEvent ||
			typeof messageEvent.data !== 'string' ||
			!messageEvent.data?.includes?.('"command"')
		) {
			return;
		}
		try {
			const json = JSON.parse(messageEvent.data);
			if (json && json.command === 'openWorkflow') {
				try {
					await handleOpenWorkflow(json);
				} catch (e) {
					reportErrorToParent(i18n.baseText('openWorkflow.workflowImportError'));
					toast.showError(e, i18n.baseText('openWorkflow.workflowImportError'));
				}
			} else if (json && json.command === 'openExecution') {
				try {
					await handleOpenExecution(json);
				} catch (e) {
					reportErrorToParent(i18n.baseText('nodeView.showError.openExecution.title'));
					toast.showMessage({
						title: i18n.baseText('nodeView.showError.openExecution.title'),
						message: (e as Error).message,
						type: 'error',
					});
				}
			} else if (json && json.command === 'openExecutionPreview') {
				try {
					await handleOpenExecutionPreview(json);
				} catch (e) {
					reportErrorToParent(i18n.baseText('nodeView.showError.openExecution.title'));
					toast.showMessage({
						title: i18n.baseText('nodeView.showError.openExecution.title'),
						message: (e as Error).message,
						type: 'error',
					});
				}
			} else if (json?.command === 'setActiveExecution') {
				executionsStore.activeExecution = (await executionsStore.fetchExecution(
					json.executionId,
				)) as ExecutionSummary;
			}
		} catch {
			// Ignore parse errors
		}
	}

	function setup() {
		window.addEventListener('message', onPostMessageReceived);
		emitPostMessageReady();
	}

	function cleanup() {
		window.removeEventListener('message', onPostMessageReceived);
	}

	return {
		setup,
		cleanup,
	};
}
