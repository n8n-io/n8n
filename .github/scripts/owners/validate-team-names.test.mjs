import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTeamSlugs, findMissingTeamSlugs } from './validate-team-names.mjs';

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

describe('findMissingTeamSlugs', () => {
	it('finds missing teams from direct, bare, and nested group references', () => {
		const owners = [
			{ team: '@n8n-io/direct-team', teams: undefined },
			{ team: '@n8n-io/core-experience', teams: ['@n8n-io/adore', '@n8n-io/ai-trust', '@n8n-io/agents'] },
		];
		const groups = new Map([
			['ai', ['ai-trust', 'agents']],
			['core-experience', ['adore', 'ai']],
		]);

		assert.deepEqual(
			findMissingTeamSlugs(new Set(['direct-team', 'adore']), owners, groups),
			['agents', 'ai-trust'],
		);
	});
});
