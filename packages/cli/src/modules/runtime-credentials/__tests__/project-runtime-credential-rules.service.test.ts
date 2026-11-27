import type { RuntimeCredentialRule } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';
import { RequestFedCredentialTypePolicy } from '@/modules/type-availability-policies/request-fed-credential-type-policy';

import { ProjectRuntimeCredentialRulesService } from '../project-runtime-credential-rules.service';
import type { RuntimeCredentialRulesService } from '../runtime-credential-rules.service';

const rule = (alias: string, credentialType: string): RuntimeCredentialRule => ({
	alias,
	nodeType: '*',
	path: 'headers.x',
	credentialType,
	source: 'database',
	stubCredentialId: `runtime-${alias}`,
});

describe('ProjectRuntimeCredentialRulesService', () => {
	const rulesService = mock<RuntimeCredentialRulesService>();
	const projectService = mock<ProjectService>();
	const policy = mock<RequestFedCredentialTypePolicy>();
	const service = new ProjectRuntimeCredentialRulesService(rulesService, projectService);

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(RequestFedCredentialTypePolicy, policy);
		RequestFedCredentialTypePolicy.isActive = true;
		projectService.findProject.mockResolvedValue(mock());
		rulesService.list.mockReturnValue([rule('a', 'slackApi'), rule('b', 'githubApi')]);
		policy.getBlockedTypes.mockResolvedValue(new Map());
	});

	afterEach(() => {
		RequestFedCredentialTypePolicy.isActive = false;
	});

	it('throws NotFoundError for an unknown project', async () => {
		projectService.findProject.mockResolvedValue(null);

		await expect(service.listForProject('missing')).rejects.toThrow(NotFoundError);
		expect(rulesService.list).not.toHaveBeenCalled();
	});

	it('marks every rule allowed when no policy blocks a type', async () => {
		const result = await service.listForProject('p1');

		expect(result.map(({ alias, access, blockedBy }) => ({ alias, access, blockedBy }))).toEqual([
			{ alias: 'a', access: 'allowed', blockedBy: null },
			{ alias: 'b', access: 'allowed', blockedBy: null },
		]);
	});

	it('marks a rule blocked and names the scope', async () => {
		policy.getBlockedTypes.mockResolvedValue(new Map([['slackApi', 'project' as const]]));

		const result = await service.listForProject('p1');

		expect(result.find((r) => r.alias === 'a')).toMatchObject({
			access: 'blocked',
			blockedBy: 'project',
		});
		expect(result.find((r) => r.alias === 'b')).toMatchObject({ access: 'allowed' });
		expect(policy.getBlockedTypes).toHaveBeenCalledWith(['slackApi', 'githubApi'], 'p1');
	});

	it('allows every rule when the policy module is inactive', async () => {
		RequestFedCredentialTypePolicy.isActive = false;

		const result = await service.listForProject('p1');

		expect(result.every((r) => r.access === 'allowed')).toBe(true);
		expect(policy.getBlockedTypes).not.toHaveBeenCalled();
	});
});
