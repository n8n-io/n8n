/**
 * Shared utilities and setup for useCanvasOperations test suites
 * Extracted from the original 3,877-line test file for better maintainability
 */

import { setActivePinia } from 'pinia';
import type {
	IConnection,
	INodeTypeDescription,
	IWebhookDescription,
	Workflow,
	INodeConnections,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, UserError } from 'n8n-workflow';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import type { CanvasConnection, CanvasNode } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type { ICredentialsResponse, IExecutionResponse, INodeUi, IWorkflowDb } from '@/Interface';
import type { IWorkflowTemplate, IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import { RemoveNodeCommand, ReplaceNodeParametersCommand } from '@/models/history';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { useNDVStore } from '@/stores/ndv.store';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowObject,
	mockNode,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { mock } from 'vitest-mock-extended';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useProjectsStore } from '@/stores/projects.store';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import {
	AGENT_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	STICKY_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type { Connection } from '@vue-flow/core';
import { useClipboard } from '@/composables/useClipboard';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtils';
import { nextTick, ref } from 'vue';
import type { CanvasLayoutEvent } from '../useCanvasLayout';
import { useTelemetry } from '../useTelemetry';
import { useToast } from '@/composables/useToast';
import * as nodeHelpers from '@/composables/useNodeHelpers';

// Mock configurations
vi.mock('n8n-workflow', async (importOriginal) => {
	const actual = await importOriginal<{}>();
	return {
		...actual,
		TelemetryHelpers: {
			generateNodesGraph: vi.fn().mockReturnValue({
				nodeGraph: {
					nodes: [],
				},
			}),
		},
	};
});

vi.mock('@/composables/useClipboard', async () => {
	const copySpy = vi.fn();
	return { useClipboard: vi.fn(() => ({ copy: copySpy })) };
});

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({ track }),
	};
});

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	const showToast = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
				showToast,
			};
		},
	};
});

// Shared test configuration
export const CANVAS_OPERATIONS_TEST_CONFIG = {
	workflowId: 'test',
	initialState: {
		[STORES.NODE_TYPES]: {},
		[STORES.NDV]: {},
		[STORES.WORKFLOWS]: {
			workflowId: 'test',
			workflow: mock<IWorkflowDb>({
				id: 'test',
				nodes: [],
				connections: {},
				tags: [],
				usedCredentials: [],
			}),
		},
		[STORES.SETTINGS]: {
			settings: {
				enterprise: {},
			},
		},
	},
};

// Shared setup function for all test suites
export function setupCanvasOperationsTest() {
	vi.clearAllMocks();

	const pinia = createTestingPinia({
		initialState: CANVAS_OPERATIONS_TEST_CONFIG.initialState,
	});
	setActivePinia(pinia);

	return {
		pinia,
		workflowId: CANVAS_OPERATIONS_TEST_CONFIG.workflowId,
	};
}

// Utility function for building import nodes
export function buildImportNodes() {
	return [
		mockNode({ id: '1', name: 'Node 1', type: SET_NODE_TYPE }),
		mockNode({ id: '2', name: 'Node 2', type: SET_NODE_TYPE }),
	].map((node) => {
		// Setting position in mockNode will wrap it in a Proxy
		// This causes deepCopy to remove position -> set position after instead
		node.position = [40, 40];
		return node;
	});
}

// Common test data factories
export function createTestConnection(source: string, target: string): CanvasConnection {
	return {
		id: `${source}-${target}`,
		source,
		target,
		sourceHandle: createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Output,
			type: NodeConnectionTypes.Main,
			index: 0,
		}),
		targetHandle: createCanvasConnectionHandleString({
			mode: CanvasConnectionMode.Input,
			type: NodeConnectionTypes.Main,
			index: 0,
		}),
		data: {
			source: {
				node: source,
				type: NodeConnectionTypes.Main,
				index: 0,
			},
			target: {
				node: target,
				type: NodeConnectionTypes.Main,
				index: 0,
			},
		},
	};
}

export function createTestCanvasNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
	return {
		id: 'test-node',
		name: 'Test Node',
		type: SET_NODE_TYPE,
		typeVersion: 1,
		position: [100, 100],
		parameters: {},
		...overrides,
	};
}

// Re-export commonly used types and constants
export type {
	IConnection,
	INodeTypeDescription,
	IWebhookDescription,
	Workflow,
	INodeConnections,
	WorkflowExecuteMode,
	CanvasConnection,
	CanvasNode,
	ICredentialsResponse,
	IExecutionResponse,
	INodeUi,
	IWorkflowDb,
	IWorkflowTemplate,
	IWorkflowTemplateNode,
	Connection,
	CanvasLayoutEvent,
};

export {
	NodeConnectionTypes,
	NodeHelpers,
	UserError,
	useCanvasOperations,
	CanvasConnectionMode,
	RemoveNodeCommand,
	ReplaceNodeParametersCommand,
	useWorkflowsStore,
	useUIStore,
	useHistoryStore,
	useNDVStore,
	createTestNode,
	createTestWorkflow,
	createTestWorkflowObject,
	mockNode,
	mockNodeTypeDescription,
	mock,
	useNodeTypesStore,
	useCredentialsStore,
	useExecutionsStore,
	useNodeCreatorStore,
	useProjectsStore,
	waitFor,
	createTestingPinia,
	mockedStore,
	AGENT_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	STICKY_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	STORES,
	useClipboard,
	createCanvasConnectionHandleString,
	nextTick,
	ref,
	useTelemetry,
	useToast,
	nodeHelpers,
	setActivePinia,
};
