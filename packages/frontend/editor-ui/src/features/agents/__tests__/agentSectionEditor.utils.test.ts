import { describe, expect, it } from 'vitest';
import {
	configToDoc,
	getSlice,
	pickFrom,
	setSlice,
	splitPath,
} from '../utils/agentSectionEditor.utils';
import type { AgentJsonConfig } from '../types';

const cfg = {
	name: 'x',
	model: 'openai/gpt-4o',
	tools: [{ type: 'node', name: 'httpRequest' }],
	config: { toolCallConcurrency: 4 },
} as unknown as AgentJsonConfig;

describe('agentSectionEditor.utils', () => {
	describe('splitPath', () => {
		it('drops empty segments', () => {
			expect(splitPath('a..b.c')).toEqual(['a', 'b', 'c']);
		});
		it('returns empty for empty input', () => {
			expect(splitPath('')).toEqual([]);
		});
	});

	describe('getSlice', () => {
		it('returns the root config when path is empty', () => {
			expect(getSlice(cfg, '')).toBe(cfg);
		});
		it('returns null when config is null', () => {
			expect(getSlice(null, 'x')).toBeNull();
		});
		it('walks dotted paths into objects', () => {
			expect(getSlice(cfg, 'config.toolCallConcurrency')).toBe(4);
		});
		it('walks numeric segments into arrays', () => {
			const slice = getSlice(cfg, 'tools.0') as { name: string };
			expect(slice.name).toBe('httpRequest');
		});
		it('returns undefined for missing keys', () => {
			expect(getSlice(cfg, 'missing.key')).toBeUndefined();
		});
	});

	describe('setSlice', () => {
		it('does not mutate the input', () => {
			const next = setSlice(cfg, 'name', 'y');
			expect(next.name).toBe('y');
			expect(cfg.name).toBe('x');
		});
		it('replaces nested object values', () => {
			const next = setSlice(cfg, 'config.toolCallConcurrency', 8);
			expect(next.config?.toolCallConcurrency).toBe(8);
		});
		it('replaces array elements at numeric paths', () => {
			const next = setSlice(cfg, 'tools.0', { type: 'workflow', workflow: 'w1' });
			expect((next.tools as Array<{ type: string }>)[0].type).toBe('workflow');
		});
		it('returns the slice as-is for an empty path', () => {
			const replacement = { name: 'z' } as AgentJsonConfig;
			expect(setSlice(cfg, '', replacement)).toBe(replacement);
		});
	});

	describe('pickFrom', () => {
		it('returns the requested keys only', () => {
			expect(pickFrom(cfg, ['name', 'model'])).toEqual({ name: 'x', model: 'openai/gpt-4o' });
		});
		it('returns an empty object when config is null', () => {
			expect(pickFrom(null, ['name'])).toEqual({});
		});
		it('skips keys missing on the source', () => {
			expect(pickFrom(cfg, ['name', 'missing'])).toEqual({ name: 'x' });
		});
	});

	describe('configToDoc', () => {
		it('returns empty for null config', () => {
			expect(configToDoc(null, null, null)).toBe('');
		});
		it('returns the pickKeys subset when provided', () => {
			expect(configToDoc(cfg, null, ['name'])).toBe('{\n  "name": "x"\n}');
		});
		it('returns the section slice when path is provided', () => {
			expect(configToDoc(cfg, 'tools.0', null)).toContain('httpRequest');
		});
		it('returns empty string when the slice is missing', () => {
			expect(configToDoc(cfg, 'missing', null)).toBe('');
		});
	});
});
