import { createTestingPinia } from '@pinia/testing';
import type { AgentListItem } from '../agent.types';
import { listAgentsPage, listAgentsPageGlobal } from './useAgentApi';
import { useAutomationAgents, type AutomationAgentsRequest } from './useAutomationAgents';

vi.mock('./useAgentApi', async (importOriginal) => ({
	...(await importOriginal<typeof import('./useAgentApi')>()),
	listAgentsPage: vi.fn(async () => ({ count: 0, data: [] })),
	listAgentsPageGlobal: vi.fn(async () => ({ count: 0, data: [] })),
}));

const agent = (id: string) => ({ id, name: `Agent ${id}` }) as AgentListItem;

const baseRequest: AutomationAgentsRequest = {
	projectId: 'p1',
	folderId: null,
	useFolders: true,
	search: '',
	includeArchived: false,
	sortBy: 'updatedAt:desc',
};

describe('useAutomationAgents', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
	});

	it('lists one folder level of a project, and searches the folder and its subfolders', async () => {
		let request = baseRequest;
		const agents = useAutomationAgents(() => request);

		await agents.fetchRange(0, 50);
		expect(listAgentsPage).toHaveBeenLastCalledWith(expect.anything(), 'p1', {
			offset: 0,
			limit: 50,
			sortBy: 'updatedAt:desc',
			filter: { parentFolderId: null },
		});

		request = { ...baseRequest, folderId: 'f1', search: 'bot', includeArchived: true };
		await agents.fetchRange(50, 50);
		expect(listAgentsPage).toHaveBeenLastCalledWith(expect.anything(), 'p1', {
			offset: 50,
			limit: 50,
			sortBy: 'updatedAt:desc',
			filter: {
				parentFolderId: 'f1',
				includeDescendants: true,
				query: 'bot',
				includeArchived: true,
			},
		});
	});

	it('lists the agents of every project on the overview, without a folder filter', async () => {
		const agents = useAutomationAgents(() => ({
			...baseRequest,
			projectId: undefined,
			useFolders: false,
		}));

		await agents.fetchRange(0, 50);

		expect(listAgentsPageGlobal).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ filter: undefined }),
		);
	});

	it('requests nothing when the list leaves agents out', async () => {
		const agents = useAutomationAgents(() => null);

		expect(await agents.fetchRange(0, 50)).toEqual({ count: 0, data: [] });
		expect(listAgentsPage).not.toHaveBeenCalled();
	});

	it('appends new agents once, and knows when every agent is loaded', () => {
		const agents = useAutomationAgents(() => baseRequest);

		agents.replace({ count: 3, data: [agent('a'), agent('b')] });
		expect(agents.done.value).toBe(false);

		agents.append({ count: 3, data: [agent('b'), agent('c')] });
		expect(agents.rows.value.map(({ id, resourceType }) => `${resourceType}:${id}`)).toEqual([
			'agent:a',
			'agent:b',
			'agent:c',
		]);
		expect(agents.done.value).toBe(true);
	});
});
