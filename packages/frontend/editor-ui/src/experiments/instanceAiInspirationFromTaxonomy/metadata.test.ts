// Experiment cleanup (129_aia_inspiration_from_taxonomy_v2)
import { describe, expect, it } from 'vitest';

import { resolveTaxonomyPromptSuggestions } from './metadata';
import { INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS } from './prompts';

const salesAndMarketingSuggestionIds = [
	'v6-taxonomy-sales-and-marketing-1-weekly-ads-and-website-report',
	'v6-taxonomy-sales-and-marketing-2-keep-crm-updated',
	'v6-taxonomy-sales-and-marketing-3-qualify-leads-and-book-calls',
	'v6-taxonomy-sales-and-marketing-4-schedule-linkedin-posts',
	'v6-taxonomy-sales-and-marketing-5-morning-news-brief',
	'v6-taxonomy-sales-and-marketing-6-invoices-from-email',
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
				suggestion_catalog_version: 'v6-taxonomy',
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

	it('returns the variant-bis catalog when that catalog is requested', () => {
		const resolution = resolveTaxonomyPromptSuggestions({
			metadata: { what_team_are_you_on: 'Sales' },
			metadataLoadState: 'loaded',
			catalog: INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS,
			catalogVersion: 'v6-taxonomy-bis',
		});

		expect(resolution.source).toBe('taxonomy');
		if (resolution.source !== 'taxonomy') return;
		expect(resolution.suggestions.map((suggestion) => suggestion.shortTitle)).toEqual([
			"Send personal follow-ups to leads who haven't replied",
			'Save form leads to a Google Sheet, email them and alert me',
			'Find and research leads that fit my ideal customer',
			'Draft SEO blog posts and newsletters for my review',
			'Meeting summaries and action items, sent to me',
			'Turn requests in emails and messages into tasks',
		]);
		expect(resolution.telemetryPayload.suggestion_catalog_version).toBe('v6-taxonomy-bis');
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
