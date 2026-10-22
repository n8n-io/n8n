import type { OperationContext, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentDefinitionService } from '../agent-definition.service';
import { AgentVersionInitializer } from '../agent-version-initializer';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

describe('Agent version initialization', () => {
	it('loads each current draft under its transaction lock and resumes until no versions are missing', async () => {
		const agents = mock<AgentRepository>();
		const definitions = mock<AgentDefinitionService>();
		const tx = mock<TransactionRunner>();
		const ctx: OperationContext = {};
		tx.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
		agents.findMissingVersionIds
			.mockResolvedValueOnce(['one', 'deleted'])
			.mockResolvedValueOnce(['two'])
			.mockResolvedValue([]);
		const one = { id: 'one', versionId: 'current-one' } as Agent;
		const two = { id: 'two', versionId: 'current-two' } as Agent;
		agents.lockForVersionCapture
			.mockResolvedValueOnce(one)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(two);

		await new AgentVersionInitializer(agents, definitions, tx).run();

		expect(definitions.captureVersion.mock.calls).toEqual([
			[one, 'Unknown', ctx],
			[two, 'Unknown', ctx],
		]);
		expect(agents.lockForVersionCapture).toHaveBeenCalledWith('one', ctx);
		expect(agents.findMissingVersionIds).toHaveBeenCalledTimes(3);
	});
	it('leaves failed skill copies for the next startup and continues through later agents', async () => {
		const agents = mock<AgentRepository>();
		const definitions = mock<AgentDefinitionService>();
		const tx = mock<TransactionRunner>();
		tx.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		agents.findMissingVersionIds
			.mockResolvedValueOnce(['failed'])
			.mockResolvedValueOnce(['ready'])
			.mockResolvedValue([]);
		const ready = { id: 'ready', versionId: 'current-ready' } as Agent;
		agents.lockForVersionCapture.mockResolvedValue(ready);

		await new AgentVersionInitializer(agents, definitions, tx).run(['failed']);

		expect(agents.lockForVersionCapture).toHaveBeenCalledExactlyOnceWith('ready', {});
		expect(agents.findMissingVersionIds).toHaveBeenNthCalledWith(2, 100, 'failed');
		expect(definitions.captureVersion).toHaveBeenCalledExactlyOnceWith(ready, 'Unknown', {});
	});
});
