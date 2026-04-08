import { Container } from '@n8n/di';

import { ExpressionEngineConfig } from '../expression-engine.config';

describe('ExpressionEngineConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.resetAllMocks();
	});

	describe('defaults', () => {
		test('bridgeTimeout defaults to 5000', () => {
			jest.replaceProperty(process, 'env', {});
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
		});

		test('bridgeMemoryLimit defaults to 128', () => {
			jest.replaceProperty(process, 'env', {});
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
		});
	});

	describe('N8N_EXPRESSION_ENGINE_TIMEOUT', () => {
		test('overrides bridgeTimeout', () => {
			jest.replaceProperty(process, 'env', { N8N_EXPRESSION_ENGINE_TIMEOUT: '1000' });
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(1000);
		});

		test('falls back to default on non-numeric value', () => {
			const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

			jest.replaceProperty(process, 'env', { N8N_EXPRESSION_ENGINE_TIMEOUT: 'not-a-number' });
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe('N8N_EXPRESSION_ENGINE_MEMORY_LIMIT', () => {
		test('overrides bridgeMemoryLimit', () => {
			jest.replaceProperty(process, 'env', { N8N_EXPRESSION_ENGINE_MEMORY_LIMIT: '64' });
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(64);
		});

		test('falls back to default on non-numeric value', () => {
			const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

			jest.replaceProperty(process, 'env', { N8N_EXPRESSION_ENGINE_MEMORY_LIMIT: 'not-a-number' });
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});
});
