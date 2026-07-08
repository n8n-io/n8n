import { describe, expect, it } from 'vitest';

import { resolveRecommendedToolNames } from '../resolve-recommended-tool-names';

describe('resolveRecommendedToolNames', () => {
	it('resolves exact tool names', () => {
		const available = new Set(['workflows', 'nodes']);
		expect(resolveRecommendedToolNames(['workflows', 'nodes'], available)).toEqual([
			'workflows',
			'nodes',
		]);
	});

	it('maps read_file to workspace_read_file when only the workspace tool exists', () => {
		const available = new Set(['workspace_read_file']);
		expect(resolveRecommendedToolNames(['read_file'], available)).toEqual(['workspace_read_file']);
	});

	it('prefers exact read_file when both names exist', () => {
		const available = new Set(['read_file', 'workspace_read_file']);
		expect(resolveRecommendedToolNames(['read_file'], available)).toEqual(['read_file']);
	});

	it('skips names with no match', () => {
		const available = new Set(['workflows']);
		expect(resolveRecommendedToolNames(['missing', 'workflows'], available)).toEqual(['workflows']);
	});
});
