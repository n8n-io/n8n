import * as restApiClient from '@n8n/rest-api-client';

import type { AquariumEntity } from '../aquarium.types';
import {
	applyMembership,
	fetchMemberProjectIds,
	hasMembership,
	isInMemberProject,
} from './membership.source';
import { emptyMetrics } from './source.utils';

const context = { restApiContext: { baseUrl: '/rest', pushRef: 'test' } };

const entity = (key: string, projectId?: string): AquariumEntity => ({
	key,
	id: key,
	kind: 'workflow',
	name: key,
	...(projectId ? { project: { id: projectId, name: projectId } } : {}),
	metrics: emptyMetrics(),
});

describe('fetchMemberProjectIds', () => {
	it('keeps projects with a project role, not those an admin sees through a global role', async () => {
		vi.spyOn(restApiClient, 'makeRestApiRequest').mockResolvedValue([
			{ id: 'personal', role: 'project:personalOwner' },
			{ id: 'team-member', role: 'project:editor' },
			{ id: 'team-other', role: 'global:admin' },
		]);

		const ids = await fetchMemberProjectIds(context);

		expect([...ids].sort()).toEqual(['personal', 'team-member']);
	});
});

describe('applyMembership', () => {
	it('marks each project, and leaves entities without a project alone', () => {
		const marked = applyMembership(
			[entity('a', 'p1'), entity('b', 'p2'), entity('c')],
			new Set(['p1']),
		);

		expect(marked.map((e) => e.project?.isMember)).toEqual([true, false, undefined]);
		expect(marked.filter(isInMemberProject).map((e) => e.key)).toEqual(['a']);
		expect(hasMembership(marked)).toBe(true);
		expect(hasMembership([entity('d', 'p1')])).toBe(false);
	});
});
