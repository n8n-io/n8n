/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { User } from '@n8n/db';

import { mockEntityManager } from '@test/mocking';

import { AgentHistory } from '../entities/agent-history.entity';
import { AgentHistoryRepository, renderAuthor } from '../repositories/agent-history.repository';

const userWith = (firstName: string | null, lastName: string | null): User =>
	({ firstName, lastName }) as User;

describe('renderAuthor', () => {
	it('joins firstName and lastName with a space', () => {
		expect(renderAuthor(userWith('Eugene', 'Molodkin'))).toBe('Eugene Molodkin');
	});

	it('returns firstName alone when lastName is null', () => {
		expect(renderAuthor(userWith('Solo', null))).toBe('Solo');
	});

	it('returns lastName alone when firstName is null', () => {
		expect(renderAuthor(userWith(null, 'Onlylast'))).toBe('Onlylast');
	});

	it('falls back to "Unknown" when both parts are missing', () => {
		expect(renderAuthor(userWith(null, null))).toBe('Unknown');
	});

	it('falls back to "Unknown" when both parts are empty strings', () => {
		expect(renderAuthor(userWith('', ''))).toBe('Unknown');
	});

	it('trims whitespace-only parts to "Unknown"', () => {
		expect(renderAuthor(userWith('   ', null))).toBe('Unknown');
	});
});

const entityManager = mockEntityManager(AgentHistory);
const mockDataSource = { manager: entityManager };

describe('AgentHistoryRepository.findByAgentId', () => {
	let repository: AgentHistoryRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repository = new AgentHistoryRepository(mockDataSource as never);
	});

	it('queries for the given agent, paginated and newest-first, with lightweight columns', async () => {
		const rows = [{ versionId: 'v2' }, { versionId: 'v1' }] as unknown as AgentHistory[];
		jest.spyOn(repository, 'find').mockResolvedValue(rows);

		const result = await repository.findByAgentId('agent-1', 20, 0);

		expect(repository.find).toHaveBeenCalledWith({
			where: { agentId: 'agent-1' },
			take: 20,
			skip: 0,
			order: { createdAt: 'DESC' },
			select: {
				versionId: true,
				agentId: true,
				createdAt: true,
				updatedAt: true,
				author: true,
			},
		});
		expect(result).toBe(rows);
	});

	it('passes take and skip through to the query', async () => {
		jest.spyOn(repository, 'find').mockResolvedValue([]);

		await repository.findByAgentId('agent-1', 5, 10);

		expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 5, skip: 10 }));
	});

	it('returns an empty array when the agent has no published versions', async () => {
		jest.spyOn(repository, 'find').mockResolvedValue([]);

		const result = await repository.findByAgentId('agent-1', 20, 0);

		expect(result).toEqual([]);
	});
});
