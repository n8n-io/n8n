import { describe, it, expect } from '@jest/globals';

import { RESERVED_KEYWORDS, toVarName, getVarName, getUniqueVarName } from './variable-names';

describe('variable-names', () => {
	describe('RESERVED_KEYWORDS', () => {
		it('includes JavaScript reserved words', () => {
			expect(RESERVED_KEYWORDS.has('break')).toBe(true);
			expect(RESERVED_KEYWORDS.has('case')).toBe(true);
			expect(RESERVED_KEYWORDS.has('const')).toBe(true);
			expect(RESERVED_KEYWORDS.has('function')).toBe(true);
			expect(RESERVED_KEYWORDS.has('return')).toBe(true);
			expect(RESERVED_KEYWORDS.has('while')).toBe(true);
		});

		it('includes JavaScript literals', () => {
			expect(RESERVED_KEYWORDS.has('null')).toBe(true);
			expect(RESERVED_KEYWORDS.has('true')).toBe(true);
			expect(RESERVED_KEYWORDS.has('false')).toBe(true);
			expect(RESERVED_KEYWORDS.has('undefined')).toBe(true);
		});

		it('includes SDK functions', () => {
			expect(RESERVED_KEYWORDS.has('workflow')).toBe(true);
			expect(RESERVED_KEYWORDS.has('trigger')).toBe(true);
			expect(RESERVED_KEYWORDS.has('node')).toBe(true);
			expect(RESERVED_KEYWORDS.has('merge')).toBe(true);
			expect(RESERVED_KEYWORDS.has('splitInBatches')).toBe(true);
		});

		it('includes dangerous globals', () => {
			expect(RESERVED_KEYWORDS.has('eval')).toBe(true);
			expect(RESERVED_KEYWORDS.has('Function')).toBe(true);
			expect(RESERVED_KEYWORDS.has('require')).toBe(true);
			expect(RESERVED_KEYWORDS.has('process')).toBe(true);
			expect(RESERVED_KEYWORDS.has('global')).toBe(true);
		});
	});

	describe('toVarName', () => {
		it('converts node name to variable name', () => {
			expect(toVarName('My Node')).toBe('my_Node');
		});

		it('replaces special characters with underscores', () => {
			expect(toVarName('My-Node@test')).toBe('my_Node_test');
		});

		it('collapses multiple underscores', () => {
			expect(toVarName('My  Node')).toBe('my_Node');
		});

		it('removes trailing underscore', () => {
			// 'Node' after processing becomes 'node' which is a reserved keyword -> 'node_node'
			expect(toVarName('Node_')).toBe('node_node');
			// A non-keyword example (first letter is lowercased)
			expect(toVarName('Process_')).toBe('process_node'); // 'process' is reserved
			expect(toVarName('Custom_')).toBe('custom');
		});

		it('preserves leading underscore when followed by digit', () => {
			expect(toVarName('_2nd Node')).toBe('_2nd_Node');
		});

		it('removes leading underscore when followed by letter', () => {
			// Removes the underscore but preserves original casing of the letter after
			expect(toVarName('_Foo')).toBe('Foo');
		});

		it('prefixes with underscore if starts with digit', () => {
			expect(toVarName('1st Node')).toBe('_1st_Node');
		});

		it('lowercases first letter', () => {
			expect(toVarName('ProcessData')).toBe('processData');
		});

		it('appends _node for reserved keywords', () => {
			expect(toVarName('function')).toBe('function_node');
			expect(toVarName('return')).toBe('return_node');
			expect(toVarName('workflow')).toBe('workflow_node');
		});

		it('handles empty string', () => {
			expect(toVarName('')).toBe('');
		});
	});

	describe('getVarName', () => {
		it('returns mapped name if exists in context', () => {
			const ctx = createContext();
			ctx.nodeNameToVarName.set('My Node', 'myNodeVar');

			expect(getVarName('My Node', ctx)).toBe('myNodeVar');
		});

		it('returns base var name if not in context', () => {
			const ctx = createContext();

			expect(getVarName('My Node', ctx)).toBe('my_Node');
		});
	});

	describe('getUniqueVarName', () => {
		it('returns and registers unique var name', () => {
			const ctx = createContext();

			const result = getUniqueVarName('My Node', ctx);

			expect(result).toBe('my_Node');
			expect(ctx.nodeNameToVarName.get('My Node')).toBe('my_Node');
			expect(ctx.usedVarNames.has('my_Node')).toBe(true);
		});

		it('returns same name on repeated calls', () => {
			const ctx = createContext();

			const first = getUniqueVarName('My Node', ctx);
			const second = getUniqueVarName('My Node', ctx);

			expect(first).toBe(second);
		});

		it('appends number for collisions', () => {
			const ctx = createContext();
			ctx.usedVarNames.add('my_Node');

			const result = getUniqueVarName('My Node', ctx);

			expect(result).toBe('my_Node1');
		});

		it('increments counter until unique', () => {
			const ctx = createContext();
			ctx.usedVarNames.add('my_Node');
			ctx.usedVarNames.add('my_Node1');
			ctx.usedVarNames.add('my_Node2');

			const result = getUniqueVarName('My Node', ctx);

			expect(result).toBe('my_Node3');
		});
	});
});

// Helper to create a minimal context for testing
function createContext() {
	return {
		nodeNameToVarName: new Map<string, string>(),
		usedVarNames: new Set<string>(),
	};
}
