/**
 * n8n URLs in the fallback host: base URLs from the environment, and the
 * resume URLs of the runtime, which pass through as they are.
 */
import { disposeExpressionEngine, NodeStepRunner, parseNodeStepArgs } from '../node-step';
import { baseUrls, splitResumeUrl, stepUrls } from '../urls';

const execution = {
	id: 'wfrt-7',
	mode: 'production' as const,
	resumeUrl: 'https://n8n.example.com/webhook-waiting/wfrt-7?signature=abc123',
	resumeFormUrl: 'https://n8n.example.com/form-waiting/wfrt-7?signature=abc123',
};

describe('n8n URLs', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	afterAll(async () => {
		await disposeExpressionEngine();
	});

	it('reads the base URLs from the environment', () => {
		const urls = baseUrls({
			WF_FALLBACK_INSTANCE_BASE_URL: 'https://n8n.example.com/',
			WF_FALLBACK_WEBHOOK_BASE_URL: 'https://hooks.example.com/webhook',
		});
		expect(urls).toEqual({
			instanceBaseUrl: 'https://n8n.example.com',
			webhookBaseUrl: 'https://hooks.example.com/webhook',
			webhookWaitingBaseUrl: 'https://n8n.example.com/webhook-waiting',
			formBaseUrl: 'https://n8n.example.com/form',
			formWaitingBaseUrl: 'https://n8n.example.com/form-waiting',
		});
	});

	it('splits a resume URL into its base and its signature', () => {
		expect(splitResumeUrl(execution.resumeUrl, execution.id)).toEqual({
			base: 'https://n8n.example.com/webhook-waiting',
			token: 'abc123',
		});
		expect(splitResumeUrl('https://x.test/other', execution.id)).toBeUndefined();
		expect(stepUrls(execution, {}).urls.formWaitingBaseUrl).toBe(
			'https://n8n.example.com/form-waiting',
		);
	});

	it('gives the runtime resume URLs unchanged to the n8n data step', async () => {
		const result = await runner.run(
			parseNodeStepArgs({
				name: 'n8n data',
				type: 'n8n-compiled.context',
				parameters: { keys: ['execution'] },
				items: [],
			}),
			{ step: 'n8n data', key: 'k', execution },
		);
		expect(result[0]).toMatchObject({ execution: { ...execution, customData: {} } });
	});

	it('gives the runtime resume URL to node expressions', async () => {
		const result = await runner.run(
			parseNodeStepArgs({
				name: 'Capture',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				parameters: {
					assignments: {
						assignments: [
							{ id: 'a', name: 'url', value: '={{ $execution.resumeUrl }}', type: 'string' },
							{ id: 'b', name: 'id', value: '={{ $execution.id }}', type: 'string' },
						],
					},
					options: {},
				},
				items: [{}],
			}),
			{ step: 'Capture', key: 'k2', execution },
		);
		expect(result).toEqual([{ url: execution.resumeUrl, id: 'wfrt-7' }]);
	});
});
