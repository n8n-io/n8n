import { isPromotionGitHostType, promotionProviderTypeSchema } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { GitHostClients } from '../git-host-clients';
import type { GitLabHostClient } from '../gitlab-host.client';

describe('GitHostClients', () => {
	const gitlab = mock<GitLabHostClient>();
	const registry = new GitHostClients(gitlab);

	it.each(promotionProviderTypeSchema.options.filter(isPromotionGitHostType))(
		'registers an adapter for %s',
		(type) => {
			const client = registry.clientFor(type);
			expect(client.validateAccess).toBeTypeOf('function');
			expect(client.listRepositories).toBeTypeOf('function');
		},
	);

	it('resolves the GitLab adapter', () => {
		expect(registry.clientFor('gitlab')).toBe(gitlab);
	});
});
