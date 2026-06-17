import { applyPatches } from '../patch-code';

describe('applyPatches', () => {
	// ── Exact match ────────────────────────────────────────────────────────────

	describe('exact match', () => {
		it('should replace a single exact match', () => {
			const code = 'const x = 1;';
			const result = applyPatches(code, [{ old_str: 'const x = 1;', new_str: 'const x = 2;' }]);
			expect(result).toEqual({ success: true, code: 'const x = 2;' });
		});

		it('should apply multiple patches sequentially', () => {
			const code = 'const a = 1;\nconst b = 2;';
			const result = applyPatches(code, [
				{ old_str: 'const a = 1;', new_str: 'const a = 10;' },
				{ old_str: 'const b = 2;', new_str: 'const b = 20;' },
			]);
			expect(result).toEqual({ success: true, code: 'const a = 10;\nconst b = 20;' });
		});

		it('should replace only the first occurrence when code has duplicates', () => {
			const code = 'foo\nfoo\nfoo';
			const result = applyPatches(code, [{ old_str: 'foo', new_str: 'bar' }]);
			expect(result).toEqual({ success: true, code: 'bar\nfoo\nfoo' });
		});
	});

	// ── Whitespace-normalized match ────────────────────────────────────────────

	describe('whitespace-normalized match', () => {
		it('should match when extra spaces exist in the code', () => {
			const code = 'const   x   =   1;';
			const result = applyPatches(code, [{ old_str: 'const x = 1;', new_str: 'const x = 2;' }]);
			expect(result).toEqual({ success: true, code: 'const x = 2;' });
		});

		it('should match when tabs are used instead of spaces', () => {
			const code = 'const\tx\t=\t1;';
			const result = applyPatches(code, [{ old_str: 'const x = 1;', new_str: 'const x = 2;' }]);
			expect(result).toEqual({ success: true, code: 'const x = 2;' });
		});

		it('should match when newlines collapse to single space', () => {
			const code = 'const\n  x\n  = 1;';
			const result = applyPatches(code, [{ old_str: 'const x = 1;', new_str: 'const x = 2;' }]);
			expect(result).toEqual({ success: true, code: 'const x = 2;' });
		});
	});

	// ── Trimmed-lines match ────────────────────────────────────────────────────

	describe('trimmed-lines match', () => {
		it('should match when code has different indentation levels', () => {
			const code = '  if (true) {\n    return 1;\n  }';
			const result = applyPatches(code, [
				{ old_str: 'if (true) {\nreturn 1;\n}', new_str: 'if (false) {\nreturn 0;\n}' },
			]);
			expect(result).toEqual({ success: true, code: 'if (false) {\nreturn 0;\n}' });
		});

		it('should match when needle has extra indentation but code does not', () => {
			const code = 'if (true) {\nreturn 1;\n}';
			const result = applyPatches(code, [
				{
					old_str: '    if (true) {\n        return 1;\n    }',
					new_str: 'if (false) {\nreturn 0;\n}',
				},
			]);
			expect(result).toEqual({ success: true, code: 'if (false) {\nreturn 0;\n}' });
		});
	});

	// ── No match ───────────────────────────────────────────────────────────────

	describe('no match', () => {
		it('should return an error when old_str is not found', () => {
			const code = 'const x = 1;';
			const result = applyPatches(code, [{ old_str: 'const y = 999;', new_str: 'const z = 0;' }]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Patch failed');
				expect(result.error).toContain('could not find old_str in code');
			}
		});

		it('should include context about the nearest match in the error', () => {
			const code = 'function hello() {\n  return "world";\n}';
			const result = applyPatches(code, [
				{ old_str: 'function hello() {\n  return "universe";\n}', new_str: 'replaced' },
			]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Nearest match');
			}
		});

		it('should include the searched string (truncated) in the error', () => {
			const code = 'short code';
			const longOldStr = 'x'.repeat(200);
			const result = applyPatches(code, [{ old_str: longOldStr, new_str: 'replacement' }]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('...');
				expect(result.error).toContain('Searched for');
			}
		});

		it('should mention all tried strategies in the error', () => {
			const code = 'const x = 1;';
			const result = applyPatches(code, [
				{ old_str: 'completely different code', new_str: 'replacement' },
			]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('exact match');
				expect(result.error).toContain('whitespace-normalized');
				expect(result.error).toContain('trimmed-lines');
			}
		});
	});

	// ── Empty patches ──────────────────────────────────────────────────────────

	describe('empty patches array', () => {
		it('should return original code unchanged', () => {
			const code = 'const x = 1;';
			const result = applyPatches(code, []);
			expect(result).toEqual({ success: true, code: 'const x = 1;' });
		});
	});

	// ── old_str equals new_str ─────────────────────────────────────────────────

	describe('old_str equals new_str', () => {
		it('should succeed and return the same code', () => {
			const code = 'const x = 1;';
			const result = applyPatches(code, [{ old_str: 'const x = 1;', new_str: 'const x = 1;' }]);
			expect(result).toEqual({ success: true, code: 'const x = 1;' });
		});
	});

	// ── Sequential patches ─────────────────────────────────────────────────────

	describe('sequential patches', () => {
		it('should apply second patch to the result of the first', () => {
			const code = 'const x = 1;';
			const result = applyPatches(code, [
				{ old_str: 'const x = 1;', new_str: 'const x = 2;' },
				{ old_str: 'const x = 2;', new_str: 'const x = 3;' },
			]);
			expect(result).toEqual({ success: true, code: 'const x = 3;' });
		});

		it('should allow second patch to reference text introduced by first patch', () => {
			const code = 'hello world';
			const result = applyPatches(code, [
				{ old_str: 'hello', new_str: 'goodbye cruel' },
				{ old_str: 'cruel world', new_str: 'moon' },
			]);
			expect(result).toEqual({ success: true, code: 'goodbye moon' });
		});
	});

	// ── Failure mid-sequence ───────────────────────────────────────────────────

	describe('failure mid-sequence', () => {
		it('should return error when second patch fails after first succeeds', () => {
			const code = 'const a = 1;\nconst b = 2;';
			const result = applyPatches(code, [
				{ old_str: 'const a = 1;', new_str: 'const a = 10;' },
				{ old_str: 'const c = 3;', new_str: 'const c = 30;' },
			]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('const c = 3;');
			}
		});

		it('should not apply any subsequent patches after a failure', () => {
			const code = 'alpha beta gamma';
			const result = applyPatches(code, [
				{ old_str: 'alpha', new_str: 'ALPHA' },
				{ old_str: 'nonexistent', new_str: 'NOPE' },
				{ old_str: 'gamma', new_str: 'GAMMA' },
			]);
			expect(result.success).toBe(false);
		});
	});

	// ── Real-world TypeScript patching ─────────────────────────────────────────

	describe('real-world example', () => {
		it('should patch TypeScript code with indentation differences', () => {
			const interpolation = '$' + '{name}';
			const code = [
				'export function greet(name: string): string {',
				'\tconst greeting = `Hello, ' + interpolation + '!`;',
				'\tconsole.log(greeting);',
				'\treturn greeting;',
				'}',
			].join('\n');

			// Patch comes in with different indentation (spaces instead of tabs)
			const result = applyPatches(code, [
				{
					old_str: [
						'  const greeting = `Hello, ' + interpolation + '!`;',
						'  console.log(greeting);',
						'  return greeting;',
					].join('\n'),
					new_str: ['\tconst greeting = `Hi, ' + interpolation + '!`;', '\treturn greeting;'].join(
						'\n',
					),
				},
			]);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.code).toContain('Hi, ' + interpolation + '!');
				expect(result.code).not.toContain('console.log');
			}
		});

		it('should patch a multiline function with whitespace differences', () => {
			const code = [
				'function add(a: number, b: number): number {',
				'    return a + b;',
				'}',
				'',
				'function subtract(a: number, b: number): number {',
				'    return a - b;',
				'}',
			].join('\n');

			const result = applyPatches(code, [
				{
					old_str: 'function add(a: number, b: number): number {\n    return a + b;\n}',
					new_str:
						'function add(a: number, b: number): number {\n    return a + b + 0; // identity\n}',
				},
			]);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.code).toContain('return a + b + 0; // identity');
				expect(result.code).toContain('function subtract');
			}
		});

		it('should handle deletion (replacing with empty string)', () => {
			const code = 'line1\nline2\nline3';
			const result = applyPatches(code, [{ old_str: '\nline2', new_str: '' }]);
			expect(result).toEqual({ success: true, code: 'line1\nline3' });
		});

		it('should handle insertion (empty old_str matches start of code)', () => {
			const code = 'existing code';
			// An empty old_str matches at index 0 via exact match (indexOf returns 0)
			const result = applyPatches(code, [{ old_str: '', new_str: '// header\n' }]);
			expect(result).toEqual({ success: true, code: '// header\nexisting code' });
		});
	});
});
