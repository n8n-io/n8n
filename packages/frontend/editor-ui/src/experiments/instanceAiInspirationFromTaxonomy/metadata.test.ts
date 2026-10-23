import { describe, expect, it } from 'vitest';

import { resolveTaxonomyPromptSuggestions } from './metadata';

const salesAndMarketingSuggestionIds = [
	'v5-taxonomy-sales-and-marketing-1-link-attio-contacts-to-their-deals',
	'v5-taxonomy-sales-and-marketing-2-route-nps-feedback-to-follow-up',
	'v5-taxonomy-sales-and-marketing-3-enrich-new-hubspot-companies',
	'v5-taxonomy-sales-and-marketing-4-ai-coaching-feedback-on-sales-calls',
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
		{
			answer: 'IT',
			segmentKey: 'it',
			suggestionIds: [
				'v5-taxonomy-it-1-detect-and-escalate-1password-vault-exports',
				'v5-taxonomy-it-2-escalate-entra-id-high-risk-users',
				'v5-taxonomy-it-3-turn-emails-into-notion-tasks',
				'v5-taxonomy-it-4-alert-on-unexplained-payment-failures',
			],
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
				suggestion_catalog_version: 'v5-taxonomy',
				suggestion_format: 'list',
				suggestion_source: 'taxonomy',
				segment_key: segmentKey,
				metadata_load_state: 'loaded',
			});
		},
	);

	it.each([
		{ name: 'the role is missing', metadata: null },
		{ name: 'the role is not mapped', metadata: { what_team_are_you_on: 'Engineering' } },
	])('falls back to control when $name', ({ metadata }) => {
		expect(
			resolveTaxonomyPromptSuggestions({
				metadata,
				metadataLoadState: 'loaded',
			}),
		).toEqual({ source: 'control' });
	});

	it('falls back to control when metadata is not loaded', () => {
		expect(
			resolveTaxonomyPromptSuggestions({
				metadata: { what_team_are_you_on: 'Sales' },
				metadataLoadState: 'not_cloud',
			}),
		).toEqual({ source: 'control' });
	});
});
