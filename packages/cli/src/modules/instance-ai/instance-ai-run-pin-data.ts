import { Container } from '@n8n/di';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	type IDataObject,
	type INode,
	type IRunExecutionData,
	type IPinData,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	type WorkflowExecutionMockDataSource,
} from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import { createTriggerExecutionData } from './trigger-run-data';

export interface InstanceAiRunPinDataPlan {
	runPinData?: IPinData;
	nonVerificationPinData: IPinData;
	verificationPinData: IPinData;
	mockDataSources: WorkflowExecutionMockDataSource[];
	startNodeName?: string;
	triggerItems?: IPinData[string];
	triggerExecutionData?: IRunExecutionData;
}

export function buildInstanceAiRunPinDataPlan(args: {
	workflowPinData: IPinData;
	verificationPinData?: Record<string, unknown[]>;
	inputData?: Record<string, unknown>;
	triggerNode?: INode;
}): InstanceAiRunPinDataPlan {
	const workflowPinData = args.workflowPinData;
	const verificationPinData = sdkPinDataToRuntime(args.verificationPinData);
	const basePinData = { ...workflowPinData, ...verificationPinData };
	let nonVerificationPinData = { ...workflowPinData };
	const mockDataSources: WorkflowExecutionMockDataSource[] = [];

	if (args.inputData && args.triggerNode) {
		mockDataSources.push('trigger_input');
	}

	if (Object.keys(verificationPinData).length > 0) {
		mockDataSources.push('verification_pin_data');
	}

	if (Object.keys(workflowPinData).length > 0) {
		mockDataSources.push('workflow_pin_data');
	}

	if (args.inputData && args.triggerNode) {
		const triggerPinData = getPinDataForTrigger(args.triggerNode, args.inputData);
		const runPinData = { ...basePinData, ...triggerPinData };
		nonVerificationPinData = { ...nonVerificationPinData, ...triggerPinData };
		const triggerItems = triggerPinData[args.triggerNode.name];

		return {
			runPinData,
			nonVerificationPinData,
			verificationPinData,
			mockDataSources,
			startNodeName: args.triggerNode.name,
			triggerItems,
			triggerExecutionData: createTriggerExecutionData({
				triggerNode: args.triggerNode,
				pinData: runPinData,
				triggerItems,
			}),
		};
	}

	const runPinData = Object.keys(basePinData).length > 0 ? basePinData : undefined;

	return {
		runPinData,
		nonVerificationPinData,
		verificationPinData,
		mockDataSources,
		triggerExecutionData: args.triggerNode
			? createTriggerExecutionData({ triggerNode: args.triggerNode, pinData: runPinData })
			: undefined,
	};
}

/**
 * Convert SDK pinData (Record<string, IDataObject[]>) to runtime format (IPinData).
 * SDK stores plain objects; runtime wraps each item in { json: item }.
 */
export function sdkPinDataToRuntime(pinData: Record<string, unknown[]> | undefined): IPinData {
	const result: IPinData = {};
	if (!pinData) return result;
	for (const [nodeName, items] of Object.entries(pinData)) {
		result[nodeName] = items.map((item) => ({ json: (item ?? {}) as IDataObject }));
	}
	return result;
}

export async function pruneUnreachedVerificationPinData(args: {
	executionId: string;
	verificationPinData: IPinData;
	nonVerificationPinData: IPinData;
	executedNodeNames?: string[];
}) {
	const { executionId, verificationPinData, nonVerificationPinData, executedNodeNames } = args;
	const verificationNodeNames = Object.keys(verificationPinData);
	if (verificationNodeNames.length === 0) return;

	const executionPersistence = Container.get(ExecutionPersistence);
	const execution = await executionPersistence.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});
	const executionData = execution?.data;
	const resultData = executionData?.resultData;
	const persistedPinData = resultData?.pinData;
	if (!executionData || !resultData || !persistedPinData) return;

	const nextPinData = getPrunedVerificationPinData({
		persistedPinData,
		verificationPinData,
		nonVerificationPinData,
		reachedNodeNames: executedNodeNames ?? Object.keys(resultData.runData ?? {}),
	});
	if (!nextPinData) return;

	const nextExecutionData: IRunExecutionData = {
		...executionData,
		resultData: {
			...resultData,
			pinData: nextPinData,
		},
	};

	await executionPersistence.updateExistingExecution(executionId, {
		data: nextExecutionData,
	});
}

export function getPrunedVerificationPinData(args: {
	persistedPinData: IPinData;
	verificationPinData: IPinData;
	nonVerificationPinData: IPinData;
	reachedNodeNames: string[];
}): IPinData | undefined {
	const reachedNodeNames = new Set(args.reachedNodeNames);
	let nextPinData: IPinData | undefined;

	for (const nodeName of Object.keys(args.verificationPinData)) {
		if (reachedNodeNames.has(nodeName) || args.persistedPinData[nodeName] === undefined) continue;

		nextPinData ??= { ...args.persistedPinData };
		const preservedPinData = args.nonVerificationPinData[nodeName];
		if (preservedPinData) {
			nextPinData[nodeName] = preservedPinData;
		} else {
			delete nextPinData[nodeName];
		}
	}

	return nextPinData;
}

function validateInputDataShape(node: INode, inputData: Record<string, unknown>): void {
	if (node.type !== FORM_TRIGGER_NODE_TYPE) return;

	const formFieldsValue = inputData.formFields;
	const looksWrapped = typeof formFieldsValue === 'object' && formFieldsValue !== null;
	if (looksWrapped) {
		throw new Error(
			'verify-built-workflow: inputData for a Form Trigger must be a flat field map ' +
				'(e.g. {name: "Alice", email: "a@b.c"}), NOT wrapped in `formFields`. ' +
				'The production Form Trigger emits fields directly on $json, so downstream ' +
				'expressions like $json.name are correct. Re-run with the flat shape.',
		);
	}
}

function toWorkflowJsonValue(value: unknown): IDataObject[string] {
	if (value === null || value === undefined) return value;

	switch (typeof value) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'object':
			return value;
		default:
			return String(value);
	}
}

/** Construct proper pin data per trigger type. */
function getPinDataForTrigger(node: INode, inputData: Record<string, unknown>): IPinData {
	validateInputDataShape(node, inputData);

	switch (node.type) {
		case CHAT_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							sessionId: `instance-ai-${Date.now()}`,
							action: 'sendMessage',
							chatInput:
								typeof inputData.chatInput === 'string'
									? inputData.chatInput
									: JSON.stringify(inputData),
						},
					},
				],
			};

		case FORM_TRIGGER_NODE_TYPE:
			return {
				[node.name]: [
					{
						json: {
							submittedAt: new Date().toISOString(),
							formMode: 'instanceAi',
							...inputData,
						},
					},
				],
			};

		case WEBHOOK_NODE_TYPE: {
			const envelopeKeys = new Set(['body', 'headers', 'query', 'params']);
			const inputKeys = Object.keys(inputData);
			const looksLikeEnvelope =
				inputKeys.length > 0 && inputKeys.every((key) => envelopeKeys.has(key));
			const body = looksLikeEnvelope
				? Object.hasOwn(inputData, 'body')
					? toWorkflowJsonValue(inputData.body)
					: {}
				: inputData;
			const headers =
				looksLikeEnvelope && typeof inputData.headers === 'object' && inputData.headers !== null
					? (inputData.headers as Record<string, unknown>)
					: {};
			const query =
				looksLikeEnvelope && typeof inputData.query === 'object' && inputData.query !== null
					? (inputData.query as Record<string, unknown>)
					: {};
			const params =
				looksLikeEnvelope && typeof inputData.params === 'object' && inputData.params !== null
					? (inputData.params as Record<string, unknown>)
					: {};
			return {
				[node.name]: [
					{
						json: { headers, query, params, body },
					},
				],
			};
		}

		case SCHEDULE_TRIGGER_NODE_TYPE: {
			const now = new Date();
			return {
				[node.name]: [
					{
						json: {
							timestamp: now.toISOString(),
							'Readable date': now.toLocaleString(),
							'Day of week': now.toLocaleDateString('en-US', { weekday: 'long' }),
							Year: String(now.getFullYear()),
							Month: now.toLocaleDateString('en-US', { month: 'long' }),
							'Day of month': String(now.getDate()).padStart(2, '0'),
							Hour: String(now.getHours()).padStart(2, '0'),
							Minute: String(now.getMinutes()).padStart(2, '0'),
							Second: String(now.getSeconds()).padStart(2, '0'),
						},
					},
				],
			};
		}

		default:
			return {
				[node.name]: [{ json: inputData as never }],
			};
	}
}
