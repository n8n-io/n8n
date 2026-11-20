import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	connectSkillSource,
	deleteSkillSource,
	discoverSkillSource,
	getSkillSourceCredentials,
	getSkillSourceReplacementCredentials,
	getSkillSourceRepositories,
	replaceSkillSourceCredential,
	updateSkillSyncSettings,
} from './skills.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('skills.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([{ keepSkills: true }, { onlySkillId: 'skill-1' }])(
		'sends source removal choices as query parameters: %j',
		async (query) => {
			await deleteSkillSource(context, 'source-1', query);
			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'DELETE',
				'/skill-sources/source-1',
				query,
			);
		},
	);

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

	it.each([
		['a project source', 'p1', '/projects/p1/skill-sources/s1'],
		['a Global source', null, '/skill-sources/s1'],
	])('sends credential replacement for %s to its scope', async (_name, projectId, path) => {
		await getSkillSourceReplacementCredentials(context, { id: 's1', projectId });
		await replaceSkillSourceCredential(context, { id: 's1', projectId }, 'c1');
		expect(makeRestApiRequest).toHaveBeenNthCalledWith(1, context, 'GET', `${path}/credentials`);
		expect(makeRestApiRequest).toHaveBeenNthCalledWith(2, context, 'POST', `${path}/credential`, {
			credentialId: 'c1',
		});
	});

	it('saves the Skill Sync switch', async () => {
		await updateSkillSyncSettings(context, { enabled: false });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'PUT', '/skill-sync/settings', {
			enabled: false,
		});
	});
});
