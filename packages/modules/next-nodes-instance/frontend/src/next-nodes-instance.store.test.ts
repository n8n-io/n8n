import type { NextNodeInstanceVersion } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import * as api from './next-nodes-instance.api';
import { useNextNodesInstanceStore } from './next-nodes-instance.store';

vi.mock('./next-nodes-instance.api');

const version = (actionId: string, semver: string): NextNodeInstanceVersion => ({
	actionId,
	semver,
	node: actionId.split('.')[0] ?? '',
	displayName: actionId,
	action: actionId,
	summary: '',
	status: 'published',
	createdAt: '2026-01-01T00:00:00.000Z',
	publishedBy: null,
	changes: [],
});

describe('useNextNodesInstanceStore', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('groups the versions by action, the newest first', async () => {
		vi.mocked(api.listVersions).mockResolvedValue([
			version('acme.greet', '1.0.1'),
			version('acme.list', '1.0.0'),
			version('acme.greet', '1.0.0'),
		]);
		const store = useNextNodesInstanceStore();

		await store.fetchVersions();

		expect(
			store.actions.map(({ actionId, newest, versions }) => [
				actionId,
				newest.semver,
				versions.length,
			]),
		).toEqual([
			['acme.greet', '1.0.1', 2],
			['acme.list', '1.0.0', 1],
		]);
	});
});
