import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ISettingsState } from '@/Interface';
import { UserManagementAuthenticationMethod } from '@/Interface';
import { defaultSettings } from './defaults';
import type { Mock } from 'vitest';
import type { Store, StoreDefinition } from 'pinia';
import type { ComputedRef } from 'vue';
import type { PushPayload } from '@n8n/api-types';
import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import {
	createRunExecutionData,
	type ExecutionSummary,
	type IRunData,
	type ITaskData,
	type ITaskStartedData,
} from 'n8n-workflow';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * @example
 * await retry(
 *   () => expect(screen.getByText('Hello')).toBeInTheDocument()
 * );
 */
export const retry = async (assertion: () => void, { interval = 20, timeout = 1000 } = {}) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(() => {
				try {
					resolve(assertion());
				} catch (error) {
					if (Date.now() - startTime > timeout) {
						reject(error);
					} else {
						tryAgain();
					}
				}
			}, interval);
		};

		tryAgain();
	});
};

export const waitAllPromises = async () => await new Promise((resolve) => setTimeout(resolve));

export const SETTINGS_STORE_DEFAULT_STATE: ISettingsState = {
	initialized: true,
	settings: defaultSettings,
	userManagement: {
		showSetupOnFirstLoad: false,
		smtpSetup: false,
		authenticationMethod: UserManagementAuthenticationMethod.Email,
		quota: defaultSettings.userManagement.quota,
		passwordMinLength: 8,
	},
	templatesEndpointHealthy: false,
	api: {
		enabled: false,
		latestVersion: 0,
		path: '/',
		swaggerUi: {
			enabled: false,
		},
	},
	ldap: {
		loginLabel: '',
		loginEnabled: false,
	},
	saml: {
		loginLabel: '',
		loginEnabled: false,
	},
	mfa: {
		enabled: false,
	},
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'all',
	saveDataProgressExecution: false,
	saveManualExecutions: false,
};

export const getDropdownItems = async (dropdownTriggerParent: HTMLElement) => {
	await userEvent.click(within(dropdownTriggerParent).getByRole('combobox'));
	const selectTrigger = dropdownTriggerParent.querySelector(
		'.select-trigger[aria-describedby]',
	) as HTMLElement;
	await waitFor(() => expect(selectTrigger).toBeInTheDocument());

	const selectDropdownId = selectTrigger.getAttribute('aria-describedby');
	const selectDropdown = document.getElementById(selectDropdownId as string) as HTMLElement;
	await waitFor(() => expect(selectDropdown).toBeInTheDocument());

	return selectDropdown.querySelectorAll('.el-select-dropdown__item');
};

export const getSelectedDropdownValue = async (items: NodeListOf<Element>) => {
	const selectedItem = Array.from(items).find((item) => item.classList.contains('selected'));
	expect(selectedItem).toBeInTheDocument();
	return selectedItem?.querySelector('p')?.textContent?.trim();
};

/**
 * Typescript helper for mocking pinia store actions return value
 *
 * @see https://pinia.vuejs.org/cookbook/testing.html#Mocking-the-returned-value-of-an-action
 */
export const mockedStore = <TStoreDef extends () => unknown>(
	useStore: TStoreDef,
): TStoreDef extends StoreDefinition<infer Id, infer State, infer Getters, infer Actions>
	? Store<
			Id,
			State,
			Record<string, never>,
			{
				[K in keyof Actions]: Actions[K] extends (...args: infer Args) => infer ReturnT
					? Mock<(...args: Args) => ReturnT>
					: Actions[K];
			}
		> & {
			[K in keyof Getters]: Getters[K] extends ComputedRef<infer T> ? T : never;
		}
	: ReturnType<TStoreDef> => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return useStore() as any;
};

export type MockedStore<T extends () => unknown> = ReturnType<typeof mockedStore<T>>;

type WorkflowDocumentStore = ReturnType<typeof useWorkflowDocumentStore>;

export type ExecutionAwareWorkflowsStore<TStore> = TStore & {
	execution: IExecutionResponse | null;
	executionRunData: IRunData | null;
	activeExecutionId: string | null | undefined;
	previousExecutionId: string | null | undefined;
	executionWaitingForWebhook: boolean;
	lastSuccessfulExecution: IExecutionResponse | null;
	selectedTriggerNodeName: string | undefined;
	chatPartialExecutionDestinationNode: string | null;
	currentWorkflowExecutions: ExecutionSummary[];
	executionStartedData:
		| [executionId: string, data: { [nodeName: string]: ITaskStartedData[] }]
		| undefined;
	getExecutionRunDataByNodeName: Mock<(nodeName: string) => ITaskData[] | null>;
	updateNodeExecutionStatus: Mock<(pushData: PushPayload<'nodeExecuteAfterData'>) => void>;
	updateNodeExecutionRunData: Mock<(pushData: PushPayload<'nodeExecuteAfterData'>) => void>;
	addNodeExecutionStartedData: Mock<(data: NodeExecuteBefore['data']) => void>;
	clearNodeExecutionData: Mock<(nodeName: string) => void>;
	removeNodeExecutionDataById: Mock<(nodeId: string) => void>;
};

function createExecutionResponse(
	currentExecution: IExecutionResponse | null,
	workflowData: IExecutionResponse['workflowData'],
	runData: IRunData,
): IExecutionResponse {
	return {
		id: currentExecution?.id ?? 'test-execution',
		finished: currentExecution?.finished ?? false,
		mode: currentExecution?.mode ?? 'manual',
		status: currentExecution?.status ?? 'running',
		retryOf: currentExecution?.retryOf,
		retrySuccessId: currentExecution?.retrySuccessId,
		startedAt: currentExecution?.startedAt ?? new Date(),
		createdAt: currentExecution?.createdAt ?? new Date(),
		stoppedAt: currentExecution?.stoppedAt,
		workflowId: currentExecution?.workflowId ?? workflowData.id,
		workflowData: currentExecution?.workflowData ?? workflowData,
		executedNode: currentExecution?.executedNode,
		triggerNode: currentExecution?.triggerNode,
		data: createRunExecutionData({
			startData: currentExecution?.data?.startData,
			resultData: {
				...currentExecution?.data?.resultData,
				runData,
			},
			executionData: currentExecution?.data?.executionData,
		}),
	};
}

/**
 * Test-only compatibility shim that lets legacy test fixtures keep using
 * `workflowsStore` execution properties while routing them into the real
 * `workflowDocumentStore`.
 */
export function attachWorkflowExecutionToDocumentStore<
	TStore extends { workflow: IExecutionResponse['workflowData'] },
>(
	workflowsStore: TStore,
	workflowDocumentStore: WorkflowDocumentStore,
): ExecutionAwareWorkflowsStore<TStore> {
	const originalGetExecutionRunDataByNodeName =
		workflowDocumentStore.getExecutionRunDataByNodeName.bind(workflowDocumentStore);
	const originalUpdateNodeExecutionStatus =
		workflowDocumentStore.updateNodeExecutionStatus.bind(workflowDocumentStore);
	const originalUpdateNodeExecutionRunData =
		workflowDocumentStore.updateNodeExecutionRunData.bind(workflowDocumentStore);
	const originalAddNodeExecutionStartedData =
		workflowDocumentStore.addNodeExecutionStartedData.bind(workflowDocumentStore);
	const originalClearNodeExecutionData =
		workflowDocumentStore.clearNodeExecutionData.bind(workflowDocumentStore);
	const originalRemoveNodeExecutionDataById =
		workflowDocumentStore.removeNodeExecutionDataById.bind(workflowDocumentStore);

	const getExecutionRunDataByNodeName = vi.fn((nodeName: string) =>
		originalGetExecutionRunDataByNodeName(nodeName),
	);
	const updateNodeExecutionStatus = vi.fn((pushData: PushPayload<'nodeExecuteAfterData'>) => {
		originalUpdateNodeExecutionStatus(pushData);
	});
	const updateNodeExecutionRunData = vi.fn((pushData: PushPayload<'nodeExecuteAfterData'>) => {
		originalUpdateNodeExecutionRunData(pushData);
	});
	const addNodeExecutionStartedData = vi.fn((data: NodeExecuteBefore['data']) => {
		originalAddNodeExecutionStartedData(data);
	});
	const clearNodeExecutionData = vi.fn((nodeName: string) => {
		originalClearNodeExecutionData(nodeName);
	});
	const removeNodeExecutionDataById = vi.fn((nodeId: string) => {
		originalRemoveNodeExecutionDataById(nodeId);
	});

	workflowDocumentStore.getExecutionRunDataByNodeName =
		getExecutionRunDataByNodeName as typeof workflowDocumentStore.getExecutionRunDataByNodeName;
	workflowDocumentStore.updateNodeExecutionStatus =
		updateNodeExecutionStatus as typeof workflowDocumentStore.updateNodeExecutionStatus;
	workflowDocumentStore.updateNodeExecutionRunData =
		updateNodeExecutionRunData as typeof workflowDocumentStore.updateNodeExecutionRunData;
	workflowDocumentStore.addNodeExecutionStartedData =
		addNodeExecutionStartedData as typeof workflowDocumentStore.addNodeExecutionStartedData;
	workflowDocumentStore.clearNodeExecutionData =
		clearNodeExecutionData as typeof workflowDocumentStore.clearNodeExecutionData;
	workflowDocumentStore.removeNodeExecutionDataById =
		removeNodeExecutionDataById as typeof workflowDocumentStore.removeNodeExecutionDataById;

	Object.defineProperties(workflowsStore, {
		execution: {
			get: () => workflowDocumentStore.execution,
			set: (value: IExecutionResponse | null) => workflowDocumentStore.setExecution(value),
			configurable: true,
		},
		executionRunData: {
			get: () => workflowDocumentStore.executionRunData,
			set: (value: IRunData | null) => {
				if (value === null) {
					workflowDocumentStore.setExecution(null);
					return;
				}

				workflowDocumentStore.setExecution(
					createExecutionResponse(workflowDocumentStore.execution, workflowsStore.workflow, value),
				);
			},
			configurable: true,
		},
		activeExecutionId: {
			get: () => workflowDocumentStore.activeExecutionId,
			set: (value: string | null | undefined) => workflowDocumentStore.setActiveExecutionId(value),
			configurable: true,
		},
		previousExecutionId: {
			get: () => workflowDocumentStore.previousExecutionId,
			set: (value: string | null | undefined) => {
				workflowDocumentStore.previousExecutionId = value;
			},
			configurable: true,
		},
		executionWaitingForWebhook: {
			get: () => workflowDocumentStore.executionWaitingForWebhook,
			set: (value: boolean) => workflowDocumentStore.setExecutionWaitingForWebhook(value),
			configurable: true,
		},
		lastSuccessfulExecution: {
			get: () => workflowDocumentStore.lastSuccessfulExecution,
			set: (value: IExecutionResponse | null) =>
				workflowDocumentStore.setLastSuccessfulExecution(value),
			configurable: true,
		},
		selectedTriggerNodeName: {
			get: () => workflowDocumentStore.selectedTriggerNodeName,
			set: (value: string | undefined) => workflowDocumentStore.setSelectedTriggerNodeName(value),
			configurable: true,
		},
		chatPartialExecutionDestinationNode: {
			get: () => workflowDocumentStore.chatPartialExecutionDestinationNode,
			set: (value: string | null) =>
				workflowDocumentStore.setChatPartialExecutionDestinationNode(value),
			configurable: true,
		},
		currentWorkflowExecutions: {
			get: () => workflowDocumentStore.currentWorkflowExecutions,
			set: (value: ExecutionSummary[]) => workflowDocumentStore.setCurrentWorkflowExecutions(value),
			configurable: true,
		},
		executionStartedData: {
			get: () => workflowDocumentStore.executionStartedData,
			set: (
				value: [executionId: string, data: { [nodeName: string]: ITaskStartedData[] }] | undefined,
			) => {
				workflowDocumentStore.executionStartedData = value;
			},
			configurable: true,
		},
		getExecutionRunDataByNodeName: {
			value: getExecutionRunDataByNodeName,
			configurable: true,
		},
		updateNodeExecutionStatus: {
			value: updateNodeExecutionStatus,
			configurable: true,
		},
		updateNodeExecutionRunData: {
			value: updateNodeExecutionRunData,
			configurable: true,
		},
		addNodeExecutionStartedData: {
			value: addNodeExecutionStartedData,
			configurable: true,
		},
		clearNodeExecutionData: {
			value: clearNodeExecutionData,
			configurable: true,
		},
		removeNodeExecutionDataById: {
			value: removeNodeExecutionDataById,
			configurable: true,
		},
	});

	return workflowsStore as ExecutionAwareWorkflowsStore<TStore>;
}

export type Emitter = (event: string, ...args: unknown[]) => void;
export type Emitters<T extends string> = Record<
	T,
	{
		emit: Emitter;
	}
>;
export const useEmitters = <T extends string>() => {
	const emitters = {} as Emitters<T>;
	return {
		emitters,
		addEmitter: (name: T, emitter: Emitter) => {
			emitters[name] = { emit: emitter };
		},
	};
};

/**
 * Helper to get the visible tooltip content container.
 * Queries the tooltip by its CSS class which is applied by N8nTooltip component.
 * This is the semantic approach since .n8n-tooltip is the design system class.
 *
 * Usage: const tooltip = getTooltip(); expect(tooltip).toHaveTextContent('...');
 */
export const getTooltip = () => {
	const tooltip = document.querySelector('.n8n-tooltip');
	if (!tooltip) {
		throw new Error('Unable to find tooltip with class .n8n-tooltip');
	}
	return tooltip as HTMLElement;
};

/**
 * Query version that returns null if not found
 */
export const queryTooltip = () => document.querySelector('.n8n-tooltip');

/**
 * Get a within() wrapper for querying inside the tooltip
 */
export const withinTooltip = () => within(getTooltip());

/**
 * Triggers tooltip hover by dispatching a proper pointermove event.
 * Works with Reka UI tooltips in JSDOM by setting correct pointerType.
 *
 * Automatically finds the actual tooltip trigger element (with data-grace-area-trigger)
 * if the passed element is a parent container.
 *
 * Requires PointerEvent polyfill in setup.ts (already configured).
 *
 * @example
 * const button = getByRole('button');
 * await hoverTooltipTrigger(button);
 * await waitFor(() => expect(getTooltip()).toHaveTextContent('Expected text'));
 */
export const hoverTooltipTrigger = async (element: Element): Promise<void> => {
	// Find actual tooltip trigger - check element, children, then ancestors
	let trigger: Element = element;

	if (element.hasAttribute('data-grace-area-trigger')) {
		trigger = element;
	} else {
		// Check children first
		const childTrigger = element.querySelector('[data-grace-area-trigger]');
		if (childTrigger) {
			trigger = childTrigger;
		} else {
			// Check ancestors
			const ancestorTrigger = element.closest('[data-grace-area-trigger]');
			if (ancestorTrigger) {
				trigger = ancestorTrigger;
			}
		}
	}

	const event = new PointerEvent('pointermove', {
		bubbles: true,
		cancelable: true,
		pointerType: 'mouse',
		clientX: 100,
		clientY: 100,
	});

	trigger.dispatchEvent(event);
	// Allow Vue reactivity and Reka UI to process
	await new Promise((r) => setTimeout(r, 10));
};
