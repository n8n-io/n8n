import { Container } from '@n8n/di';

import { ScalingModeConfig } from '../scaling-mode.config';

describe('ScalingModeConfig.workerPool', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	test('defaults to empty string when N8N_WORKER_POOL is unset', () => {
		process.env = {};
		const config = Container.get(ScalingModeConfig);
		expect(config.workerPool.name).toBe('');
	});

	test('accepts a valid label', () => {
		process.env = { N8N_WORKER_POOL: 'gpu' };
		const config = Container.get(ScalingModeConfig);
		expect(config.workerPool.name).toBe('gpu');
	});

	test('accepts lowercase alphanumeric with hyphens', () => {
		process.env = { N8N_WORKER_POOL: 'a1-b2-c3' };
		const config = Container.get(ScalingModeConfig);
		expect(config.workerPool.name).toBe('a1-b2-c3');
	});

	test.each([
		['uppercase', 'GPU'],
		['underscore', 'g_pu'],
		['space', 'g pu'],
		['leading hyphen', '-gpu'],
		['colon', 'g:pu'],
		['dot', 'g.pu'],
		['too long', 'a'.repeat(64)],
	])('falls back to default and warns on invalid label (%s)', (_label, value) => {
		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
		process.env = { N8N_WORKER_POOL: value };

		const config = Container.get(ScalingModeConfig);

		expect(config.workerPool.name).toBe('');
		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('N8N_WORKER_POOL'));

		consoleWarnSpy.mockRestore();
	});
});
