import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	PERSONALIZED_PROMPT_PROFILE_OVERRIDE_CLEAR_VALUE,
	PERSONALIZED_PROMPT_PROFILE_OVERRIDE_FALLBACK_VALUE,
	PERSONALIZED_PROMPT_PROFILE_OVERRIDE_QUERY_PARAM,
	PERSONALIZED_PROMPT_PROFILE_OVERRIDE_STORAGE_KEY,
	parsePersonalizedPromptProfileOverride,
	usePersonalizedPromptProfileOverride,
} from './profileOverride';

describe('instance AI personalized prompt profile override', () => {
	beforeEach(() => {
		const storage = new Map<string, string>();

		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => storage.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => {
				storage.set(key, value);
			}),
			removeItem: vi.fn((key: string) => {
				storage.delete(key);
			}),
			clear: vi.fn(() => {
				storage.clear();
			}),
		});
		window.history.replaceState({}, '', '/');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('parses exact catalog bucket keys', () => {
		expect(parsePersonalizedPromptProfileOverride('sales:lead-nurturing')).toEqual({
			kind: 'segment',
			role: 'sales',
			useCase: 'lead-nurturing',
			segmentKey: 'sales:lead-nurturing',
		});
		expect(parsePersonalizedPromptProfileOverride('marketing:role-default')).toEqual({
			kind: 'segment',
			role: 'marketing',
			useCase: 'role-default',
			segmentKey: 'marketing:role-default',
		});
		expect(parsePersonalizedPromptProfileOverride('executive-owner:global-top-performers')).toEqual(
			{
				kind: 'segment',
				role: 'executive-owner',
				useCase: 'global-top-performers',
				segmentKey: 'executive-owner:global-top-performers',
			},
		);
	});

	it('parses the fallback override', () => {
		expect(
			parsePersonalizedPromptProfileOverride(PERSONALIZED_PROMPT_PROFILE_OVERRIDE_FALLBACK_VALUE),
		).toEqual({ kind: 'fallback' });
	});

	it('ignores unknown and impossible profile combinations', () => {
		expect(parsePersonalizedPromptProfileOverride('sales:data-protection')).toBeNull();
		expect(parsePersonalizedPromptProfileOverride('operations:role-default')).toBeNull();
		expect(parsePersonalizedPromptProfileOverride('sales')).toBeNull();
		expect(parsePersonalizedPromptProfileOverride(null)).toBeNull();
	});

	it('stores a valid URL override for deployed testing', async () => {
		window.history.replaceState(
			{},
			'',
			`/?${PERSONALIZED_PROMPT_PROFILE_OVERRIDE_QUERY_PARAM}=sales:lead-nurturing`,
		);

		const override = usePersonalizedPromptProfileOverride();

		expect(override.value).toEqual({
			kind: 'segment',
			role: 'sales',
			useCase: 'lead-nurturing',
			segmentKey: 'sales:lead-nurturing',
		});

		await nextTick();

		expect(localStorage.getItem(PERSONALIZED_PROMPT_PROFILE_OVERRIDE_STORAGE_KEY)).toBe(
			'sales:lead-nurturing',
		);
	});

	it('clears a stored override from the URL', async () => {
		localStorage.setItem(PERSONALIZED_PROMPT_PROFILE_OVERRIDE_STORAGE_KEY, 'sales:lead-nurturing');
		window.history.replaceState(
			{},
			'',
			`/?${PERSONALIZED_PROMPT_PROFILE_OVERRIDE_QUERY_PARAM}=${PERSONALIZED_PROMPT_PROFILE_OVERRIDE_CLEAR_VALUE}`,
		);

		const override = usePersonalizedPromptProfileOverride();

		expect(override.value).toBeNull();

		await nextTick();

		expect(localStorage.getItem(PERSONALIZED_PROMPT_PROFILE_OVERRIDE_STORAGE_KEY)).toBeNull();
	});
});
