import { getProviderPrefix, splitModelId } from '../model-id';

describe('getProviderPrefix', () => {
	it('returns the prefix before the first slash', () => {
		expect(getProviderPrefix('anthropic/claude-sonnet-4-5')).toBe('anthropic');
	});

	it('returns an empty string when there is no prefix', () => {
		expect(getProviderPrefix('claude-sonnet-4-5')).toBe('');
	});
});

describe('splitModelId', () => {
	it('splits a prefixed id into provider and model', () => {
		expect(splitModelId('anthropic/claude-sonnet-4-5')).toEqual({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});
	});

	it('treats an unprefixed id as the model with an empty provider', () => {
		expect(splitModelId('claude-sonnet-4-5')).toEqual({
			provider: '',
			model: 'claude-sonnet-4-5',
		});
	});

	it('keeps everything after the first slash as the model for multi-slash ids', () => {
		expect(splitModelId('openrouter/amazon/nova-micro-v1')).toEqual({
			provider: 'openrouter',
			model: 'amazon/nova-micro-v1',
		});
	});

	it('falls back to the raw id when the model segment is empty', () => {
		expect(splitModelId('anthropic/')).toEqual({ provider: '', model: 'anthropic/' });
		expect(splitModelId('/')).toEqual({ provider: '', model: '/' });
	});

	it('returns an empty model for an empty id', () => {
		expect(splitModelId('')).toEqual({ provider: '', model: '' });
	});
});
