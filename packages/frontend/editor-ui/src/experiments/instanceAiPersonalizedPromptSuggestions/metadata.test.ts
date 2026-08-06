import { describe, expect, it } from 'vitest';

import {
	resolvePersonalizedPromptSuggestions,
	resolvePromptSegment,
	type CloudPersonalizationMetadata,
} from './metadata';
import type { PersonalizedPromptProfileOverride } from './profileOverride';
import { INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS } from './prompts';
import type { PersonalizedPromptDisplaySuggestion, PersonalizedPromptSuggestion } from './types';

const fallbackSuggestions = [
	{
		id: 'whatsapp-support-agent',
		shortTitle: 'WhatsApp support agent',
		description: 'Fallback prompt 1',
		builderPrompt: 'Fallback prompt 1',
	},
	{
		id: 'process-invoices',
		shortTitle: 'Process invoices',
		description: 'Fallback prompt 2',
		builderPrompt: 'Fallback prompt 2',
	},
	{
		id: 'schedule-social-posts',
		shortTitle: 'Schedule social posts',
		description: 'Fallback prompt 3',
		builderPrompt: 'Fallback prompt 3',
	},
	{
		id: 'qualify-inbound-leads',
		shortTitle: 'Qualify inbound leads',
		description: 'Fallback prompt 4',
		builderPrompt: 'Fallback prompt 4',
	},
] satisfies PersonalizedPromptDisplaySuggestion[];

const salesLeadNurturingCatalog = [1, 2, 3, 4].map((order) => ({
	id: `v4-sales-lead-nurturing-${order}`,
	role: 'sales',
	useCase: 'lead-nurturing',
	order,
	style: 'tool-specific',
	shortTitle: `Sales title ${order}`,
	description: `Sales description ${order}`,
	builderPrompt: `Sales prompt ${order}`,
})) satisfies PersonalizedPromptSuggestion[];

const supportedCatalogBuckets = [
	'engineering:data-management',
	'engineering:development-support',
	'engineering:insights-reporting',
	'engineering:role-default',
	'executive-owner:global-top-performers',
	'it:data-protection',
	'it:it-service-desk',
	'it:role-default',
	'it:scam-phishing-detection',
	'marketing:campaign-audience-engagement',
	'marketing:content-creation',
	'marketing:data-insights',
	'marketing:role-default',
	'other:role-default',
	'product-design:content-asset-creation',
	'product-design:insights-reporting',
	'product-design:role-default',
	'product-design:user-market-research',
	'sales:lead-generation-qualification',
	'sales:lead-nurturing',
	'sales:market-research',
	'sales:role-default',
	'support:customer-inquiries',
	'support:inbox-process-automation',
	'support:issue-resolution',
	'support:role-default',
];

function resolve(metadata: CloudPersonalizationMetadata) {
	return resolvePersonalizedPromptSuggestions({
		metadata,
		metadataLoadState: 'loaded',
		format: 'cards',
		fallbackSuggestions,
		catalog: salesLeadNurturingCatalog,
	});
}

describe('instance AI personalized prompt metadata', () => {
	it('has exactly four ordered prompts for every supported real catalog bucket', () => {
		const promptsByBucket = new Map<string, number[]>();
		const ids = new Set<string>();

		for (const suggestion of INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS) {
			ids.add(suggestion.id);
			const bucketKey = `${suggestion.role}:${suggestion.useCase}`;
			promptsByBucket.set(bucketKey, [...(promptsByBucket.get(bucketKey) ?? []), suggestion.order]);
		}

		expect(INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS).toHaveLength(104);
		expect(ids.size).toBe(INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS.length);
		expect([...promptsByBucket.keys()].sort()).toEqual(supportedCatalogBuckets);
		for (const orders of promptsByBucket.values()) {
			expect(orders.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
		}
	});

	it('maps exact role and use-case answers to a matrix segment', () => {
		expect(
			resolvePromptSegment({
				what_team_are_you_on: 'Sales',
				what_do_you_automate_sales: 'Lead nurturing',
			}),
		).toEqual({
			source: 'matrix',
			role: 'sales',
			useCase: 'lead-nurturing',
			segmentKey: 'sales:lead-nurturing',
		});
	});

	it('uses role default when a known role skips the second question', () => {
		expect(resolvePromptSegment({ what_team_are_you_on: 'Marketing' })).toEqual({
			source: 'role_default',
			role: 'marketing',
			useCase: 'role-default',
			segmentKey: 'marketing:role-default',
		});
	});

	it('uses role default when a known role answers Something else', () => {
		expect(
			resolvePromptSegment({
				what_team_are_you_on: 'Support',
				what_do_you_automate_support: 'Something else',
			}),
		).toEqual({
			source: 'role_default',
			role: 'support',
			useCase: 'role-default',
			segmentKey: 'support:role-default',
		});
	});

	it('maps Executive/Owner to global top performers', () => {
		expect(resolvePromptSegment({ what_team_are_you_on: 'Executive/Owner' })).toEqual({
			source: 'global_top_performers',
			role: 'executive-owner',
			useCase: 'global-top-performers',
			segmentKey: 'executive-owner:global-top-performers',
		});
	});

	it('maps Other to role default', () => {
		expect(resolvePromptSegment({ what_team_are_you_on: 'Other' })).toEqual({
			source: 'role_default',
			role: 'other',
			useCase: 'role-default',
			segmentKey: 'other:role-default',
		});
	});

	it('falls back when the role is missing or unrecognized', () => {
		expect(resolvePromptSegment({})).toEqual({ source: 'v2_top_used_fallback' });
		expect(resolvePromptSegment({ what_team_are_you_on: 'Operations' })).toEqual({
			source: 'v2_top_used_fallback',
		});
	});

	it('falls back when a known role has an unrecognized use case', () => {
		expect(
			resolvePromptSegment({
				what_team_are_you_on: 'Sales',
				what_do_you_automate_sales: 'Renewals',
			}),
		).toEqual({ source: 'v2_top_used_fallback', role: 'sales' });
	});

	it('falls back when metadata values are malformed', () => {
		expect(resolvePromptSegment({ what_team_are_you_on: ['Sales'] })).toEqual({
			source: 'v2_top_used_fallback',
		});
		expect(
			resolvePromptSegment({
				what_team_are_you_on: 'Sales',
				what_do_you_automate_sales: ['Lead nurturing'],
			}),
		).toEqual({ source: 'v2_top_used_fallback', role: 'sales' });
	});

	it('returns ordered matrix suggestions when the catalog has exactly four matches', () => {
		const resolution = resolve({
			what_team_are_you_on: 'Sales',
			what_do_you_automate_sales: 'Lead nurturing',
		});

		expect(resolution.suggestions.map((suggestion) => suggestion.id)).toEqual([
			'v4-sales-lead-nurturing-1',
			'v4-sales-lead-nurturing-2',
			'v4-sales-lead-nurturing-3',
			'v4-sales-lead-nurturing-4',
		]);
		expect(resolution.showSeeMore).toBe(true);
		expect(resolution.telemetryPayload).toMatchObject({
			suggestion_catalog_version: 'v4-personalized',
			suggestion_format: 'cards',
			suggestion_source: 'matrix',
			profile_role: 'sales',
			profile_use_case: 'lead-nurturing',
			segment_key: 'sales:lead-nurturing',
			metadata_load_state: 'loaded',
		});
	});

	it('uses the top-used v2 fallback when metadata is unavailable', () => {
		const resolution = resolvePersonalizedPromptSuggestions({
			metadata: null,
			metadataLoadState: 'timed_out',
			format: 'list',
			fallbackSuggestions,
			catalog: salesLeadNurturingCatalog,
		});

		expect(resolution.suggestions.map((suggestion) => suggestion.id)).toEqual([
			'whatsapp-support-agent',
			'process-invoices',
			'schedule-social-posts',
			'qualify-inbound-leads',
		]);
		expect(resolution.showSeeMore).toBe(false);
		expect(resolution.telemetryPayload).toMatchObject({
			suggestion_format: 'list',
			suggestion_source: 'v2_top_used_fallback',
			metadata_load_state: 'timed_out',
		});
	});

	it('uses a profile override before cloud metadata state', () => {
		const profileOverride = {
			kind: 'segment',
			role: 'marketing',
			useCase: 'content-creation',
			segmentKey: 'marketing:content-creation',
		} satisfies PersonalizedPromptProfileOverride;

		const resolution = resolvePersonalizedPromptSuggestions({
			metadata: null,
			metadataLoadState: 'failed',
			format: 'cards',
			fallbackSuggestions,
			profileOverride,
		});

		expect(resolution.suggestions.map((suggestion) => suggestion.id)).toEqual([
			'v4-marketing-content-creation-1-generate-ai-videos-for-tiktok',
			'v4-marketing-content-creation-2-write-a-week-of-social-posts',
			'v4-marketing-content-creation-3-create-blog-images-with-ai',
			'v4-marketing-content-creation-4-turn-articles-into-social-content',
		]);
		expect(resolution.showSeeMore).toBe(true);
		expect(resolution.telemetryPayload).toMatchObject({
			suggestion_source: 'matrix',
			profile_role: 'marketing',
			profile_use_case: 'content-creation',
			segment_key: 'marketing:content-creation',
			metadata_load_state: 'loaded',
			profile_override: true,
		});
	});

	it('uses the top-used v2 fallback when the profile override forces fallback', () => {
		const resolution = resolvePersonalizedPromptSuggestions({
			metadata: {
				what_team_are_you_on: 'Sales',
				what_do_you_automate_sales: 'Lead nurturing',
			},
			metadataLoadState: 'loaded',
			format: 'cards',
			fallbackSuggestions,
			profileOverride: { kind: 'fallback' },
			catalog: salesLeadNurturingCatalog,
		});

		expect(resolution.suggestions).toEqual(fallbackSuggestions);
		expect(resolution.showSeeMore).toBe(false);
		expect(resolution.telemetryPayload).toMatchObject({
			suggestion_source: 'v2_top_used_fallback',
			metadata_load_state: 'loaded',
			profile_override: true,
		});
	});

	it('uses the top-used v2 fallback when the prompt catalog does not have a complete bucket', () => {
		const resolution = resolvePersonalizedPromptSuggestions({
			metadata: {
				what_team_are_you_on: 'Sales',
				what_do_you_automate_sales: 'Lead nurturing',
			},
			metadataLoadState: 'loaded',
			format: 'cards',
			fallbackSuggestions,
			catalog: [],
		});

		expect(resolution.suggestions).toEqual(fallbackSuggestions);
		expect(resolution.showSeeMore).toBe(false);
		expect(resolution.telemetryPayload).toMatchObject({
			suggestion_source: 'v2_top_used_fallback',
			profile_role: 'sales',
			profile_use_case: 'lead-nurturing',
			metadata_load_state: 'loaded',
		});
	});
});
