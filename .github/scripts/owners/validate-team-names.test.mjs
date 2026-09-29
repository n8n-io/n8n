import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTeamSlugs } from './validate-team-names.mjs';

describe('fetchTeamSlugs', () => {
	it('fetches all team pages', async () => {
		const requests = [];
		const fetchImpl = async (url) => {
			requests.push(url);
			const page = new URL(url).searchParams.get('page');
			const teams = page === '1' ? Array.from({ length: 100 }, (_, index) => ({ slug: `first-${index}` })) : [{ slug: 'second' }];
			return new Response(JSON.stringify(teams), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		};

		const slugs = await fetchTeamSlugs(fetchImpl);

		assert.equal(slugs.size, 101);
		assert.ok(slugs.has('second'));
		assert.deepEqual(requests.map((url) => new URL(url).searchParams.get('page')), ['1', '2']);
	});
});
