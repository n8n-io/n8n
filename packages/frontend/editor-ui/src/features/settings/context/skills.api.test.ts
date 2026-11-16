import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	connectSkillSource,
	discoverSkillSource,
	getSkillSourceCredentials,
	getSkillSourceRepositories,
} from './skills.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('skills.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists the credentials a source scope accepts', async () => {
		await getSkillSourceCredentials(context, { scope: 'project', projectId: 'team-1' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/skill-sources/credentials', {
			scope: 'project',
			projectId: 'team-1',
		});
	});

	it('lists the repositories a credential can read', async () => {
		await getSkillSourceRepositories(context, { scope: 'instance', credentialId: 'cred-1' });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/skill-sources/repositories', {
			scope: 'instance',
			credentialId: 'cred-1',
		});
	});

	it('sends the credential to discover and connect', async () => {
		const target = {
			url: 'https://github.com/acme/private',
			scope: 'instance' as const,
			credentialId: 'cred-1',
		};

		await discoverSkillSource(context, target);
		await connectSkillSource(context, { ...target, skillKeys: ['skills/pdf'] });

		expect(makeRestApiRequest).toHaveBeenNthCalledWith(
			1,
			context,
			'POST',
			'/skill-sources/discover',
			target,
		);
		expect(makeRestApiRequest).toHaveBeenNthCalledWith(2, context, 'POST', '/skill-sources', {
			...target,
			skillKeys: ['skills/pdf'],
		});
	});
});
