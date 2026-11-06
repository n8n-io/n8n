import { reportLlmUsage, runWithLlmCallContext } from '@n8n/ai-utilities/llm-usage';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { LlmUsageCollector } from '../llm-usage-collector.service';
import { LlmUsageConfig } from '../llm-usage.config';
import { LlmUsageRepository } from '../llm-usage.repository';

const catalog = {
	version: 'v1',
	models: [{ provider: 'openai', model: 'gpt-4o-mini', prices: { input: 0.01, output: 0.02 } }],
};

describe('llm-usage end to end', () => {
	let module: { init?: () => Promise<void>; shutdown?: () => Promise<void> };

	beforeAll(async () => {
		await testModules.loadModules(['llm-usage'], {
			'llm-usage': async () => await import('../llm-usage.module.js'),
		});
		await testDb.init();

		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(
			mock<HttpRequestClient>({
				request: vi.fn().mockResolvedValue({ statusCode: 200, headers: {}, body: catalog }),
			}),
		);
		Container.set(OutboundHttp, outboundHttp);
		Container.get(LlmUsageConfig).catalogUrl = 'http://catalog.test';

		const moduleClass = Container.get(ModuleMetadata).get('llm-usage')?.class;
		module = Container.get(moduleClass!);
		await module.init?.();
	});

	afterAll(async () => {
		await module.shutdown?.();
		await testDb.terminate();
	});

	it('stores a call reported inside a scope, with context and price', async () => {
		await runWithLlmCallContext({ callerType: 'node', workflowId: 'wf-1' }, async () => {
			reportLlmUsage({
				provider: 'openai',
				model: 'gpt-4o-mini-2024-07-18',
				providerResponseId: 'chatcmpl-1',
				inputTokens: 100,
				outputTokens: 10,
				finishedAt: new Date(),
			});
		});

		await Container.get(LlmUsageCollector).flush();

		const rows = await Container.get(LlmUsageRepository).find();
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			workflowId: 'wf-1',
			callerType: 'node',
			model: 'gpt-4o-mini-2024-07-18',
			priced: true,
		});
		expect(rows[0].estimatedCostUsd).toBeCloseTo(1.2);
	});
});
