import type { InstanceAiEvalNodeResult } from '@n8n/api-types';

import { type ServiceEvent, attachSimEvents, caseFields, flagSimRun } from '../evidence';

const at = (ms: number) => new Date(ms).toISOString();

const nodeResult = (runTimes: Array<{ startTime: number; executionTime: number }>) =>
	({
		outputs: {},
		outputCount: 0,
		iterationCount: runTimes.length,
		interceptedRequests: [],
		executionMode: 'real',
		runTimes,
	}) as InstanceAiEvalNodeResult;

const request = (
	ms: number,
	path: string,
	status: number,
	extra: Partial<NonNullable<ServiceEvent['request']>> = {},
): ServiceEvent => ({
	kind: 'request',
	ts: at(ms),
	service: 'slack',
	request: { method: 'POST', path, status, ...extra },
});

describe('attachSimEvents', () => {
	it('files each request under the innermost node run in progress, and returns the rest', () => {
		const nodeResults = {
			Agent: nodeResult([{ startTime: 1_000, executionTime: 5_000 }]),
			'Chat Model': nodeResult([{ startTime: 2_000, executionTime: 500 }]),
			Post: nodeResult([
				{ startTime: 7_000, executionTime: 100 },
				{ startTime: 8_000, executionTime: 100 },
			]),
		};
		const types = { Agent: 'agent', 'Chat Model': 'lmChatOpenAi', Post: 'slack' };

		const unattributed = attachSimEvents(nodeResults, types, [
			request(2_100, '/v1/chat/completions', 200),
			request(4_000, '/api/users.list', 200),
			request(8_050, '/api/chat.postMessage', 200),
			request(60_000, '/api/late', 200),
		]);

		expect(nodeResults['Chat Model'].interceptedRequests.map((r) => r.url)).toEqual([
			'slack /v1/chat/completions',
		]);
		expect(nodeResults.Agent.interceptedRequests.map((r) => r.url)).toEqual([
			'slack /api/users.list',
		]);
		expect(nodeResults.Post.interceptedRequests[0]).toMatchObject({
			nodeType: 'slack',
			mockResponse: { simulated: true, status: 200 },
		});
		expect(unattributed.map((e) => e.request?.path)).toEqual(['/api/late']);
	});

	it('files a request under the run that covers it, not a shorter run next to it', () => {
		const nodeResults = {
			Send: nodeResult([{ startTime: 10_000, executionTime: 18 }]),
			Mark: nodeResult([{ startTime: 10_019, executionTime: 6 }]),
		};

		attachSimEvents(nodeResults, { Send: 'gmail', Mark: 'gmail' }, [
			request(10_005, '/messages/send', 200),
			request(10_021, '/messages/m1/modify', 200),
			request(10_030, '/messages/m1/skewed', 200),
		]);

		expect(nodeResults.Send.interceptedRequests.map((r) => r.url)).toEqual([
			'slack /messages/send',
		]);
		expect(nodeResults.Mark.interceptedRequests.map((r) => r.url)).toEqual([
			'slack /messages/m1/modify',
			'slack /messages/m1/skewed',
		]);
	});
});

describe('attachSimEvents error messages', () => {
	it("keeps the sim server's reason for a failed call", () => {
		const nodeResults = { Ask: nodeResult([{ startTime: 1_000, executionTime: 100 }]) };

		attachSimEvents(nodeResults, { Ask: 'openAi' }, [
			request(1_050, '/v1/responses', 404, { error: 'model_not_found' }),
		]);

		expect(nodeResults.Ask.interceptedRequests[0].mockResponse).toMatchObject({
			status: 404,
			error: 'model_not_found',
		});
	});
});

describe('flagSimRun', () => {
	it('flags calls the simulation does not implement, once each', () => {
		const flags = flagSimRun([
			request(1, '/api/files.remote.add', 501),
			request(2, '/api/files.remote.add', 501),
			request(3, '/api/admin.x', 404, { listed: false }),
			request(4, '/api/chat.postMessage', 200),
		]);

		expect(flags.gaps).toEqual([
			'slack POST /api/files.remote.add -> 501 (not implemented by the simulation)',
			'slack POST /api/admin.x -> 404 (not implemented by the simulation)',
		]);
	});
});

describe('caseFields', () => {
	it('finds setup fields and names, and keeps given ids, typos of them, expressions and models', () => {
		const parameters = {
			documentId: { __rl: true, mode: 'list', value: '' },
			sheetName: { __rl: true, mode: 'name', value: 'Stock' },
			tabName: { __rl: true, mode: 'name', value: 'Sales' },
			channelId: { __rl: true, mode: 'id', value: '__evalMockResource' },
			databaseId: { __rl: true, mode: 'id', value: '1aB2cD3eF4' },
			pageId: { __rl: true, mode: 'id', value: 'page-42' },
			targetId: { __rl: true, mode: 'id', value: 'C04DAILYDGO1' },
			userId: { __rl: true, mode: 'id', value: '={{ $json.user }}' },
			modelId: { __rl: true, mode: 'list', value: 'models/gemini-2.5-flash' },
			options: { fields: ['YOUR_API_KEY', 'name'] },
			columns: {
				mappingMode: 'defineBelow',
				value: { 'Channel URL': '={{ $json.url }}' },
				schema: [],
			},
		};
		const fields = caseFields(
			[{ name: 'Node', parameters }],
			'Update page page-42, post to C04DAILYDG01, keep the Sales tab',
		);
		expect(fields.setup.map((f) => f.path)).toEqual([
			'Node.documentId',
			'Node.channelId',
			'Node.databaseId',
			'Node.options.fields.0',
		]);
		expect(fields.openNames.map((f) => f.path)).toEqual([
			'Node.sheetName',
			'Node.tabName',
			'Node.columns',
		]);
		expect(fields.resources).toHaveLength(1);
		expect(fields.resources[0]).toContain(
			'Node: documentId = "" (list), sheetName = "Stock" (name)',
		);
		expect(fields.resources[0]).toContain('columns = columns ["Channel URL"]');
	});
});
