import { DEFAULT_TEXT_VISION_MODEL } from './modelParams';
import {
	ensurePreferredModelInOptions,
	getDefaultModelIdForLoadOptions,
	normalizeOperationForLoadOptions,
	normalizeResourceForLoadOptions,
} from './loadOptionsModelList';

describe('loadOptionsModelList', () => {
	describe('normalizeResourceForLoadOptions', () => {
		it('maps invalid values (e.g. numeric 0 from bad fallback) to text', () => {
			expect(normalizeResourceForLoadOptions(0)).toBe('text');
			expect(normalizeResourceForLoadOptions(undefined)).toBe('text');
			expect(normalizeResourceForLoadOptions('')).toBe('text');
		});

		it('preserves valid resources', () => {
			expect(normalizeResourceForLoadOptions('image')).toBe('image');
			expect(normalizeResourceForLoadOptions('file')).toBe('file');
			expect(normalizeResourceForLoadOptions('audio')).toBe('audio');
		});
	});

	describe('normalizeOperationForLoadOptions', () => {
		it('uses resource-appropriate fallbacks', () => {
			expect(normalizeOperationForLoadOptions('text', 0)).toBe('message');
			expect(normalizeOperationForLoadOptions('image', 0)).toBe('generate');
			expect(normalizeOperationForLoadOptions('file', undefined)).toBe('analyze');
			expect(normalizeOperationForLoadOptions('audio', '')).toBe('transcribe');
		});
	});

	describe('getDefaultModelIdForLoadOptions', () => {
		it('returns vision default for messageVision', () => {
			expect(getDefaultModelIdForLoadOptions('text', 'messageVision')).toBe(
				DEFAULT_TEXT_VISION_MODEL,
			);
		});

		it('returns resource default for standard operations', () => {
			expect(getDefaultModelIdForLoadOptions('text', 'message')).toBe('openai/gpt-4.1-mini');
			expect(getDefaultModelIdForLoadOptions('image', 'generate')).toBe(
				'google/gemini-2.5-flash-image',
			);
			expect(getDefaultModelIdForLoadOptions('file', 'analyze')).toBe('anthropic/claude-sonnet-4');
			expect(getDefaultModelIdForLoadOptions('audio', 'transcribe')).toBe(
				'openai/gpt-4o-mini-transcribe',
			);
		});
	});

	describe('ensurePreferredModelInOptions', () => {
		it('prepends missing preferred id', () => {
			const out = ensurePreferredModelInOptions(
				[{ name: 'Other', value: 'other/model', description: '{}' }],
				'openai/gpt-4.1-mini',
			);
			expect(out[0]?.value).toBe('openai/gpt-4.1-mini');
			expect(out).toHaveLength(2);
		});

		it('does not duplicate when already present', () => {
			const opts = [{ name: 'X', value: 'openai/gpt-4.1-mini', description: '{}' }];
			expect(ensurePreferredModelInOptions(opts, 'openai/gpt-4.1-mini')).toBe(opts);
		});
	});
});
