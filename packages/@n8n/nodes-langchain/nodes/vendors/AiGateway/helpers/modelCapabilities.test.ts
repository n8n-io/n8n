import { filterModelsForOperation } from './modelCapabilities';
import type { OpenRouterModel } from '../../../../utils/n8nAiGatewayOpenRouter';

function model(id: string, overrides: Partial<OpenRouterModel> = {}): OpenRouterModel {
	return {
		id,
		name: id,
		architecture: {
			input_modalities: [],
			output_modalities: [],
		},
		supported_parameters: [],
		...overrides,
	};
}

describe('filterModelsForOperation', () => {
	const models: OpenRouterModel[] = [
		model('openai/gpt-4.1-mini'),
		model('openai/gpt-4o', {
			architecture: {
				input_modalities: ['image', 'text'],
				output_modalities: ['text'],
			},
		}),
		model('openai/gpt-4o-mini', {
			supported_parameters: ['response_format'],
		}),
		model('text-embedding-3-small'),
		model('google/gemini-2.5-flash-image', {
			architecture: {
				input_modalities: ['text', 'image'],
				output_modalities: ['text', 'image'],
			},
		}),
		model('openai/gpt-4o-audio', {
			architecture: {
				input_modalities: ['text', 'audio'],
				output_modalities: ['text'],
			},
		}),
		model('anthropic/claude-sonnet-4', {
			architecture: {
				input_modalities: ['text', 'image', 'file'],
				output_modalities: ['text'],
			},
		}),
	];

	it('returns chat models for text message', () => {
		const filtered = filterModelsForOperation(models, 'text', 'message');
		expect(filtered.some((m) => m.id === 'text-embedding-3-small')).toBe(false);
		expect(filtered.length).toBeGreaterThan(0);
	});

	it('prefers models with image input for messageVision', () => {
		const filtered = filterModelsForOperation(models, 'text', 'messageVision');
		expect(filtered.some((m) => m.id === 'openai/gpt-4o')).toBe(true);
	});

	it('prefers models with response_format for json', () => {
		const filtered = filterModelsForOperation(models, 'text', 'json');
		expect(filtered.some((m) => m.id === 'openai/gpt-4o-mini')).toBe(true);
	});

	it('filters image generation candidates', () => {
		const filtered = filterModelsForOperation(models, 'image', 'generate');
		expect(filtered.some((m) => m.id === 'google/gemini-2.5-flash-image')).toBe(true);
	});

	it('filters file analysis candidates', () => {
		const filtered = filterModelsForOperation(models, 'file', 'analyze');
		expect(filtered.some((m) => m.id === 'anthropic/claude-sonnet-4')).toBe(true);
	});

	it('filters audio candidates', () => {
		const filtered = filterModelsForOperation(models, 'audio', 'transcribe');
		expect(filtered.some((m) => m.id === 'openai/gpt-4o-audio')).toBe(true);
	});

	it('falls back to chat models when strict filter yields fewer than 3', () => {
		const onlyText = [model('foo/bar'), model('baz/qux'), model('abc/def')];
		const filtered = filterModelsForOperation(onlyText, 'image', 'generate');
		expect(filtered.length).toBe(3);
	});
});
