import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentsSettingsService } from '../../../../agents-settings.service';
import type { ProjectAgent } from '../../../../entities/agent.entity';
import type { AgentRepository } from '../../../../repositories/agent.repository';
import { McpServerResourceResolver } from '../mcp-server-resource.resolver';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const BASE = 'https://n8n.example.com/agent-webhook';

function setup(agentOverrides: Partial<ProjectAgent> = {}, enabled = true) {
	const config = mock<GlobalConfig>({ endpoints: { agentWebhook: 'agent-webhook' } });
	const urlService = mock<UrlService>();
	urlService.getAgentMcpUrl.mockImplementation((id) => `${BASE}/${encodeURIComponent(id)}/mcp`);
	const agent = mock<ProjectAgent>({
		id: 'agent-1',
		name: 'Support',
		projectId: 'project-1',
		activeVersionId: 'version-1',
		integrations: [{ type: 'mcp_server', credentialId: '' }],
		...agentOverrides,
	});
	const agentRepository = mock<AgentRepository>();
	agentRepository.findById.mockResolvedValue(agent);
	const userRepository = mock<UserRepository>();
	const settings = mock<AgentsSettingsService>();
	settings.getEnabled.mockResolvedValue(enabled);
	const resolver = new McpServerResourceResolver(
		config,
		urlService,
		agentRepository,
		userRepository,
		settings,
	);
	return { resolver, agentRepository, userRepository };
}

describe('McpServerResourceResolver', () => {
	beforeEach(() => vi.clearAllMocks());

	it('should resolve the resource of a published agent with the channel', async () => {
		const { resolver, agentRepository } = setup();

		const resource = await resolver.resolveByPath('/agent-webhook/agent-1/mcp');

		expect(agentRepository.findById).toHaveBeenCalledWith('agent-1');
		expect(resource?.getResourceUrl()).toBe(`${BASE}/agent-1/mcp`);
		expect(resource?.getAudiences()).toEqual([`${BASE}/agent-1/mcp`]);
		expect(resource?.displayName).toBe('Support');
	});

	it.each([
		'/agent-webhook/agent-1/responses',
		'/agent-webhook/agent-1/extra/mcp',
		'/agent-webhook//mcp',
		'/mcp-server/http',
	])('should ignore the path %s', async (path) => {
		const { resolver, agentRepository } = setup();

		expect(await resolver.resolveByPath(path)).toBeUndefined();
		expect(agentRepository.findById).not.toHaveBeenCalled();
	});

	it('should resolve nothing for an unpublished agent', async () => {
		const { resolver } = setup({ activeVersionId: null });

		expect(await resolver.resolveByPath('/agent-webhook/agent-1/mcp')).toBeUndefined();
	});

	it('should resolve nothing when the agent has no MCP server channel', async () => {
		const { resolver } = setup({ integrations: [{ type: 'n8n_chat', credentialId: '' }] });

		expect(await resolver.resolveByPath('/agent-webhook/agent-1/mcp')).toBeUndefined();
	});

	it('should resolve nothing when agents are turned off', async () => {
		const { resolver } = setup({}, false);

		expect(await resolver.resolveByPath('/agent-webhook/agent-1/mcp')).toBeUndefined();
	});

	it('should resolve by URL only on the canonical host', async () => {
		const { resolver } = setup();

		expect(await resolver.resolveByUrl(`${BASE}/agent-1/mcp`)).toBeDefined();
		expect(
			await resolver.resolveByUrl('https://other.example.com/agent-webhook/agent-1/mcp'),
		).toBeUndefined();
	});

	it('should authorize only users who can run agents in the project', async () => {
		const { resolver, userRepository } = setup();
		const user = mock<User>({ id: 'user-1' });
		userRepository.findByIdWithRole.mockResolvedValue(user);
		vi.mocked(userHasScopes).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const resource = await resolver.resolveByPath('/agent-webhook/agent-1/mcp');

		expect(await resource?.authorize({ id: 'user-1' } as never)).toBe(true);
		expect(await resource?.authorize({ id: 'user-1' } as never)).toBe(false);
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:execute'], false, {
			projectId: 'project-1',
		});
	});

	it('should not authorize an unknown user', async () => {
		const { resolver, userRepository } = setup();
		userRepository.findByIdWithRole.mockResolvedValue(null);
		const resource = await resolver.resolveByPath('/agent-webhook/agent-1/mcp');

		expect(await resource?.authorize({ id: 'ghost' } as never)).toBe(false);
		expect(userHasScopes).not.toHaveBeenCalled();
	});
});
