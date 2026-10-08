import { Container } from '@n8n/di';

import { CanvasOnlyConfig } from '../canvas-only.config';

describe('CanvasOnlyConfig', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		Container.reset();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('defaults', () => {
		test('enabled is false', () => {
			process.env = {};
			expect(Container.get(CanvasOnlyConfig).enabled).toBe(false);
		});

		test('personalSpaceScopeDenyList is empty', () => {
			process.env = {};
			expect(Container.get(CanvasOnlyConfig).personalSpaceScopeDenyList).toEqual([]);
		});
	});

	describe('N8N_CANVAS_ONLY', () => {
		test('sets enabled to true', () => {
			process.env = { N8N_CANVAS_ONLY: 'true' };
			expect(Container.get(CanvasOnlyConfig).enabled).toBe(true);
		});
	});

	describe('N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST', () => {
		test('parses a comma-separated list of deniable scopes', () => {
			process.env = {
				N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST: 'credential:create,agent:create',
			};
			expect(Container.get(CanvasOnlyConfig).personalSpaceScopeDenyList).toEqual([
				'credential:create',
				'agent:create',
			]);
		});

		test('accepts every deniable scope', () => {
			process.env = {
				N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST:
					'credential:create,dataTable:create,agent:create',
			};
			expect(Container.get(CanvasOnlyConfig).personalSpaceScopeDenyList).toEqual([
				'credential:create',
				'dataTable:create',
				'agent:create',
			]);
		});

		test('trims whitespace, drops empty entries and removes duplicates', () => {
			process.env = {
				N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST:
					' credential:create , ,agent:create,credential:create,',
			};
			expect(Container.get(CanvasOnlyConfig).personalSpaceScopeDenyList).toEqual([
				'credential:create',
				'agent:create',
			]);
		});

		test('treats a blank value as an empty list', () => {
			process.env = { N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST: '' };
			expect(Container.get(CanvasOnlyConfig).personalSpaceScopeDenyList).toEqual([]);
		});

		test.each([
			['a scope that is not deniable', 'credential:create,workflow:create'],
			['an unknown value', 'nonsense'],
		])('warns and keeps the default when the list contains %s', (_label, value) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			process.env = { N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST: value };

			expect(Container.get(CanvasOnlyConfig).personalSpaceScopeDenyList).toEqual([]);
			expect(warn).toHaveBeenCalledWith(
				expect.stringContaining('Invalid value for N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST'),
			);
		});
	});
});
