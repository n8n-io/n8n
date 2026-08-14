import type { INode, IPinData } from 'n8n-workflow';
import { FORM_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import {
	buildInstanceAiRunPinDataPlan,
	getPrunedVerificationPinData,
	sdkPinDataToRuntime,
} from '../instance-ai-run-pin-data';

function makeTriggerNode(type: string, name: string): INode {
	return {
		id: name,
		name,
		type,
		typeVersion: 1,
		parameters: {},
		position: [0, 0],
	};
}

describe('Instance AI run pin-data planning', () => {
	it('converts SDK pin data into runtime pin data', () => {
		expect(
			sdkPinDataToRuntime({
				'HTTP Request': [{ ok: true }, { id: 'second' }],
			}),
		).toEqual({
			'HTTP Request': [{ json: { ok: true } }, { json: { id: 'second' } }],
		});
	});

	it('merges workflow pins, verification pins, and trigger input into one run plan', () => {
		const triggerNode = makeTriggerNode(WEBHOOK_NODE_TYPE, 'Webhook');
		const workflowPinData: IPinData = {
			'User Pinned Node': [{ json: { source: 'workflow' } }],
		};

		const plan = buildInstanceAiRunPinDataPlan({
			workflowPinData,
			verificationPinData: {
				'Simulated Node': [{ source: 'verification' }],
			},
			inputData: { event: 'signup' },
			triggerNode,
		});

		expect(plan.runPinData).toEqual({
			'User Pinned Node': [{ json: { source: 'workflow' } }],
			'Simulated Node': [{ json: { source: 'verification' } }],
			Webhook: [{ json: { headers: {}, query: {}, params: {}, body: { event: 'signup' } } }],
		});
		expect(plan.nonVerificationPinData).toEqual({
			'User Pinned Node': [{ json: { source: 'workflow' } }],
			Webhook: [{ json: { headers: {}, query: {}, params: {}, body: { event: 'signup' } } }],
		});
		expect(plan.verificationPinData).toEqual({
			'Simulated Node': [{ json: { source: 'verification' } }],
		});
		expect(plan.mockDataSources).toEqual([
			'trigger_input',
			'verification_pin_data',
			'workflow_pin_data',
		]);
		expect(plan.startNodeName).toBe('Webhook');
		expect(plan.triggerItems).toEqual([
			{ json: { headers: {}, query: {}, params: {}, body: { event: 'signup' } } },
		]);
		expect(plan.triggerExecutionData?.resultData.pinData).toEqual(plan.runPinData);
		expect(plan.triggerExecutionData?.executionData?.nodeExecutionStack[0]?.node).toBe(triggerNode);
	});

	it('preserves webhook envelope params and primitive body payloads', () => {
		const triggerNode = makeTriggerNode(WEBHOOK_NODE_TYPE, 'Webhook');

		const plan = buildInstanceAiRunPinDataPlan({
			workflowPinData: {},
			inputData: {
				headers: { 'x-request-id': 'req-1' },
				query: { search: 'rain' },
				params: { city: 'berlin' },
				body: 'raw-payload',
			},
			triggerNode,
		});

		expect(plan.triggerItems).toEqual([
			{
				json: {
					headers: { 'x-request-id': 'req-1' },
					query: { search: 'rain' },
					params: { city: 'berlin' },
					body: 'raw-payload',
				},
			},
		]);
	});

	it('rejects wrapped form trigger input', () => {
		const triggerNode = makeTriggerNode(FORM_TRIGGER_NODE_TYPE, 'Form');

		expect(() =>
			buildInstanceAiRunPinDataPlan({
				workflowPinData: {},
				inputData: { formFields: { name: 'Alice' } },
				triggerNode,
			}),
		).toThrow('must be a flat field map');
	});
});

describe('verification pin-data pruning', () => {
	it('removes unreached verification-only pins while preserving workflow pins', () => {
		const persistedPinData: IPinData = {
			'Reached Simulated Node': [{ json: { source: 'verification' } }],
			'Unreached Simulated Node': [{ json: { source: 'verification' } }],
			'Shared Pin Node': [{ json: { source: 'verification' } }],
			'Workflow Pin Node': [{ json: { source: 'workflow' } }],
		};

		const pruned = getPrunedVerificationPinData({
			persistedPinData,
			verificationPinData: {
				'Reached Simulated Node': [{ json: { source: 'verification' } }],
				'Unreached Simulated Node': [{ json: { source: 'verification' } }],
				'Shared Pin Node': [{ json: { source: 'verification' } }],
			},
			nonVerificationPinData: {
				'Shared Pin Node': [{ json: { source: 'workflow' } }],
				'Workflow Pin Node': [{ json: { source: 'workflow' } }],
			},
			reachedNodeNames: ['Reached Simulated Node'],
		});

		expect(pruned).toEqual({
			'Reached Simulated Node': [{ json: { source: 'verification' } }],
			'Shared Pin Node': [{ json: { source: 'workflow' } }],
			'Workflow Pin Node': [{ json: { source: 'workflow' } }],
		});
		expect(persistedPinData).toHaveProperty('Unreached Simulated Node');
	});

	it('returns undefined when pruning would not change persisted pin data', () => {
		const persistedPinData: IPinData = {
			'Reached Simulated Node': [{ json: { source: 'verification' } }],
		};

		expect(
			getPrunedVerificationPinData({
				persistedPinData,
				verificationPinData: persistedPinData,
				nonVerificationPinData: {},
				reachedNodeNames: ['Reached Simulated Node'],
			}),
		).toBeUndefined();
	});
});
