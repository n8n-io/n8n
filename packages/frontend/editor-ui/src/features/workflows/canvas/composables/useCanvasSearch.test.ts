import { nextTick, ref } from 'vue';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { buildNodeSearchText, useCanvasSearch } from './useCanvasSearch';

const httpNode = createTestNode({
	id: 'http',
	name: 'Fetch users',
	type: 'n8n-nodes-base.httpRequest',
	parameters: { url: 'https://api.example.com/Users', method: 'POST' },
}) as INodeUi;

const setNode = createTestNode({
	id: 'set',
	name: 'Edit fields',
	type: 'n8n-nodes-base.set',
	parameters: { mode: 'manual', fields: { values: [{ name: 'status', value: 'active' }] } },
}) as INodeUi;

const ifNode = createTestNode({
	id: 'if',
	name: 'Check status',
	type: 'n8n-nodes-base.if',
	parameters: {},
}) as INodeUi;

const typeLabels: Record<string, string> = {
	'n8n-nodes-base.httpRequest': 'HTTP Request',
	'n8n-nodes-base.set': 'Edit Fields',
	'n8n-nodes-base.if': 'If',
};

function setup(nodes: INodeUi[] = [httpNode, setNode, ifNode]) {
	const nodesRef = ref(nodes);
	const onNavigate = vi.fn();
	const search = useCanvasSearch({
		nodes: () => nodesRef.value,
		resolveTypeLabel: (node) => typeLabels[node.type],
		onNavigate,
	});
	return { search, onNavigate, nodesRef };
}

function matchedIds(search: ReturnType<typeof useCanvasSearch>): string[] {
	return search.matches.value.map((node) => node.id);
}

describe('buildNodeSearchText', () => {
	it('includes name, type, type label and parameter keys/values', () => {
		const text = buildNodeSearchText(httpNode, 'HTTP Request');
		expect(text).toContain('Fetch users');
		expect(text).toContain('n8n-nodes-base.httpRequest');
		expect(text).toContain('HTTP Request');
		expect(text).toContain('url');
		expect(text).toContain('https://api.example.com/Users');
		expect(text).toContain('POST');
	});

	it('recurses into nested arrays and objects', () => {
		const text = buildNodeSearchText(setNode);
		expect(text).toContain('status');
		expect(text).toContain('active');
	});
});

describe('useCanvasSearch', () => {
	it('has no matches and is inactive for an empty query', () => {
		const { search } = setup();
		search.open();
		expect(search.matchCount.value).toBe(0);
		expect(search.isSearchActive.value).toBe(false);
	});

	it('matches by node name (case-insensitive by default)', () => {
		const { search } = setup();
		search.open();
		search.query.value = 'fetch';
		expect(matchedIds(search)).toEqual(['http']);
	});

	it('matches by internal node type', () => {
		const { search } = setup();
		search.open();
		search.query.value = 'httpRequest';
		expect(matchedIds(search)).toEqual(['http']);
	});

	it('matches by resolved type display name', () => {
		const { search } = setup();
		search.open();
		search.query.value = 'edit fields';
		// Matches the "Edit fields" node name and the "Edit Fields" type label of the set node.
		expect(matchedIds(search)).toEqual(['set']);
	});

	it('matches by parameter value', () => {
		const { search } = setup();
		search.open();
		search.query.value = 'api.example.com';
		expect(matchedIds(search)).toEqual(['http']);
	});

	it('matches by parameter key', () => {
		const { search } = setup();
		search.open();
		search.query.value = 'method';
		expect(matchedIds(search)).toEqual(['http']);
	});

	it('honours case sensitivity', () => {
		const { search } = setup();
		search.open();
		search.query.value = 'USERS';
		expect(matchedIds(search)).toEqual(['http']);

		search.caseSensitive.value = true;
		expect(matchedIds(search)).toEqual([]);

		search.query.value = 'Users';
		expect(matchedIds(search)).toEqual(['http']);
	});

	it('supports regular expressions', () => {
		const { search } = setup();
		search.open();
		search.useRegex.value = true;
		search.query.value = '^Check';
		expect(matchedIds(search)).toEqual(['if']);

		search.query.value = 'fetch|check';
		expect(matchedIds(search)).toEqual(['http', 'if']);
	});

	it('reports invalid regular expressions and matches nothing', () => {
		const { search } = setup();
		search.open();
		search.useRegex.value = true;
		search.query.value = '[';
		expect(search.regexError.value).toBeTruthy();
		expect(search.matchCount.value).toBe(0);
		expect(search.isSearchActive.value).toBe(false);
	});

	it('is active and exposes matching ids only while open', () => {
		const { search } = setup();
		search.query.value = 'fetch';

		// Closed: no highlight even though the query matches.
		expect(search.matchingNodeIds.value.size).toBe(0);
		expect(search.isSearchActive.value).toBe(false);

		search.open();
		expect(search.matchingNodeIds.value.has('http')).toBe(true);
		expect(search.isSearchActive.value).toBe(true);

		search.close();
		expect(search.matchingNodeIds.value.size).toBe(0);
		expect(search.isSearchActive.value).toBe(false);
	});

	it('cycles forward through matches with wrap-around', () => {
		const { search, onNavigate } = setup();
		search.open();
		search.query.value = 'status'; // matches set + if

		expect(search.matchCount.value).toBe(2);

		search.goToNext();
		expect(search.activeMatchIndex.value).toBe(0);
		expect(onNavigate).toHaveBeenLastCalledWith('set');

		search.goToNext();
		expect(search.activeMatchIndex.value).toBe(1);
		expect(onNavigate).toHaveBeenLastCalledWith('if');

		search.goToNext();
		expect(search.activeMatchIndex.value).toBe(0);
		expect(onNavigate).toHaveBeenLastCalledWith('set');
	});

	it('cycles backward starting from the last match', () => {
		const { search, onNavigate } = setup();
		search.open();
		search.query.value = 'status';

		search.goToPrevious();
		expect(search.activeMatchIndex.value).toBe(1);
		expect(onNavigate).toHaveBeenLastCalledWith('if');
	});

	it('resets navigation when the query changes', async () => {
		const { search } = setup();
		search.open();
		search.query.value = 'status';
		search.goToNext();
		expect(search.activeMatchIndex.value).toBe(0);

		search.query.value = 'fetch';
		await nextTick();
		expect(search.activeMatchIndex.value).toBe(-1);
	});

	it('clamps the active index when the match set shrinks', async () => {
		const { search, nodesRef } = setup();
		search.open();
		search.query.value = 'status';
		await nextTick(); // let the query-change reset settle before navigating
		search.goToNext();
		search.goToNext();
		expect(search.activeMatchIndex.value).toBe(1);

		// Remove the "if" node so only one match remains.
		nodesRef.value = [httpNode, setNode];
		await nextTick();
		expect(search.activeMatchIndex.value).toBe(0);
	});
});
