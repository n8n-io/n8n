// Experiment cleanup (142_aia_inspiration_from_taxonomy_v3)
import { describe, expect, it } from 'vitest';

import { resolveTaxonomyPromptSuggestions } from './metadata';

const salesAndMarketingSuggestionIds = [
	'v6-taxonomy-sales-and-marketing-3-qualify-leads-and-book-calls',
	'v6-taxonomy-bis-sales-and-marketing-3-research-ideal-customers',
	'v6-taxonomy-bis-sales-and-marketing-2-form-leads-to-sheet',
	'v6-taxonomy-sales-and-marketing-2-keep-crm-updated',
	'v6-taxonomy-bis-sales-and-marketing-6-messages-into-tasks',
	'v6-taxonomy-bis-sales-and-marketing-5-meeting-summaries',
];

describe('instance AI inspiration from taxonomy metadata', () => {
	it.each([
		{
			answer: 'Sales',
			segmentKey: 'sales-and-marketing',
			suggestionIds: salesAndMarketingSuggestionIds,
		},
		{
			answer: 'Marketing',
			segmentKey: 'sales-and-marketing',
			suggestionIds: salesAndMarketingSuggestionIds,
		},
	])(
		'returns the $segmentKey catalog for the $answer role',
		({ answer, segmentKey, suggestionIds }) => {
			const resolution = resolveTaxonomyPromptSuggestions({
				metadata: { what_team_are_you_on: answer },
				metadataLoadState: 'loaded',
			});

			expect(resolution.source).toBe('taxonomy');
			if (resolution.source !== 'taxonomy') {
				return;
			}

			expect(resolution.suggestions.map((suggestion) => suggestion.id)).toEqual(suggestionIds);
			expect(resolution.showSeeMore).toBe(false);
			expect(resolution.telemetryPayload).toEqual({
				suggestion_catalog_version: 'v7-taxonomy',
				suggestion_format: 'list',
				suggestion_source: 'taxonomy',
				segment_key: segmentKey,
				metadata_load_state: 'loaded',
			});
		},
	);

	it.each([
		{ name: 'the role is missing', metadata: null },
		{ name: 'the role is IT', metadata: { what_team_are_you_on: 'IT' } },
		{ name: 'the role is not mapped', metadata: { what_team_are_you_on: 'Engineering' } },
	])('excludes the user when $name', ({ metadata }) => {
		expect(
			resolveTaxonomyPromptSuggestions({
				metadata,
				metadataLoadState: 'loaded',
			}),
		).toEqual({ source: 'excluded' });
	});

	it('excludes the user when metadata is not loaded', () => {
		expect(
			resolveTaxonomyPromptSuggestions({
				metadata: { what_team_are_you_on: 'Sales' },
				metadataLoadState: 'not_cloud',
			}),
		).toEqual({ source: 'excluded' });
	});

	it('reports the rows format for the variant layout', () => {
		const resolution = resolveTaxonomyPromptSuggestions({
			metadata: { what_team_are_you_on: 'Sales' },
			metadataLoadState: 'loaded',
			suggestionFormat: 'rows',
		});

		expect(resolution.source).toBe('taxonomy');
		if (resolution.source !== 'taxonomy') return;
		expect(resolution.telemetryPayload.suggestion_format).toBe('rows');
	});
});
