import { afterEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useTimelineItemExpansion } from './useTimelineItemExpansion';

const scopes: Array<ReturnType<typeof effectScope>> = [];

afterEach(() => {
	for (const scope of scopes) scope.stop();
	scopes.length = 0;
});

function setup(query = '  RESEARCH  ', expandable = true) {
	const scope = effectScope();
	scopes.push(scope);
	const searchQuery = ref<string | undefined>(query);
	const canExpand = ref(expandable);
	const searchableText = ref('Research results');
	const expansion = scope.run(() =>
		useTimelineItemExpansion({ searchQuery, canExpand, searchableText }),
	);
	if (!expansion) throw new Error('Expected an active scope');
	return { ...expansion, searchQuery, canExpand, searchableText };
}

describe('useTimelineItemExpansion', () => {
	it('opens an initial match without case or surrounding spaces', () => {
		expect(setup().isOpen.value).toBe(true);
	});

	it('keeps manual expansion for a non-matching search', async () => {
		const state = setup('other');
		expect(state.isOpen.value).toBe(false);
		state.isOpen.value = true;
		state.searchQuery.value = 'another';
		await nextTick();
		expect(state.isOpen.value).toBe(true);
	});

	it.each(['', '   ', undefined])('closes when search is cleared to %s', async (query) => {
		const state = setup();
		state.searchQuery.value = query;
		await nextTick();
		expect(state.isOpen.value).toBe(false);
	});

	it('closes when expansion is disabled and reopens a match when enabled', async () => {
		const state = setup();
		state.canExpand.value = false;
		await nextTick();
		expect(state.isOpen.value).toBe(false);
		state.canExpand.value = true;
		await nextTick();
		expect(state.isOpen.value).toBe(true);
	});

	it('does not open when only the searchable text changes', async () => {
		const state = setup('other');
		state.searchableText.value = 'Other results';
		await nextTick();
		expect(state.isOpen.value).toBe(false);
	});

	it('opens when a changed query matches the text', async () => {
		const state = setup('other');
		expect(state.isOpen.value).toBe(false);

		state.searchQuery.value = 'results';
		await nextTick();

		expect(state.isOpen.value).toBe(true);
	});

	it('stays closed when expansion starts disabled despite a matching query', () => {
		expect(setup('research', false).isOpen.value).toBe(false);
	});

	it('keeps an open match expanded when the next query does not match', async () => {
		const state = setup();
		expect(state.isOpen.value).toBe(true);

		state.searchQuery.value = 'other';
		await nextTick();

		expect(state.isOpen.value).toBe(true);
	});

	it('keeps a matching item manually collapsed when only its text changes', async () => {
		const state = setup();
		state.isOpen.value = false;
		state.searchableText.value = 'Research results received';
		await nextTick();

		expect(state.isOpen.value).toBe(false);
	});

	it('checks new content when expansion becomes available with the same query', async () => {
		const state = setup('report', false);
		state.searchableText.value = 'Report results received';
		await nextTick();
		expect(state.isOpen.value).toBe(false);

		state.canExpand.value = true;
		await nextTick();

		expect(state.isOpen.value).toBe(true);
	});

	it('keeps an expanded item open when only its text stops matching', async () => {
		const state = setup();
		state.searchableText.value = 'Other results';
		await nextTick();

		expect(state.isOpen.value).toBe(true);
	});

	it('accepts getter inputs', () => {
		const scope = effectScope();
		scopes.push(scope);
		const expansion = scope.run(() =>
			useTimelineItemExpansion({
				searchQuery: () => 'result',
				canExpand: () => true,
				searchableText: () => 'Result',
			}),
		);
		expect(expansion?.isOpen.value).toBe(true);
	});
});
