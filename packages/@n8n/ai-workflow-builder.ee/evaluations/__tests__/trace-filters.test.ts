/**
 * Tests for LangSmith trace filters.
 */

import type { KVMap } from 'langsmith/schemas';

import { createTraceFilters } from '../core/trace-filters';
import type { EvalLogger } from '../utils/logger';

describe('trace-filters', () => {
	it('should not trim messages (keeps array) while still filtering other large state fields', () => {
		const logs: string[] = [];
		const logger: EvalLogger = {
			isVerbose: true,
			info: (m) => logs.push(m),
			verbose: (m) => logs.push(m),
			success: (m) => logs.push(m),
			warn: (m) => logs.push(m),
			error: (m) => logs.push(m),
			dim: (m) => logs.push(m),
		};

		const { filterInputs } = createTraceFilters(logger);

		const msg = { type: 'ai', content: 'hello' };
		const input: KVMap = {
			cachedTemplates: [{ templateId: 't1', name: 'Template' }],
			messages: [msg],
		};

		const filtered = filterInputs({ ...input });

		expect(Array.isArray(filtered.messages)).toBe(true);
		expect(filtered.messages).toEqual([msg]);
		expect(filtered.cachedTemplates).toEqual([{ templateId: 't1', name: 'Template' }]);
		expect(logs.join('\n')).toContain('LangSmith trace filtering: ACTIVE');
	});
});
