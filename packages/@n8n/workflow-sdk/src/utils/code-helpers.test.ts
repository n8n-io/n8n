import { runOnceForAllItems, runOnceForEachItem } from './code-helpers';

describe('Code Node Helpers', () => {
	describe('runOnceForAllItems()', () => {
		it('should create a code helper with correct mode', () => {
			const result = runOnceForAllItems<{ sum: number }>((ctx) => {
				const total = ctx.$input
					.all()
					.reduce((acc, i) => acc + (i.json as { value: number }).value, 0);
				return [{ json: { sum: total } }];
			});

			expect(result.mode).toBe('runOnceForAllItems');
		});

		it('should serialize the function body', () => {
			const result = runOnceForAllItems<{ sum: number }>((ctx) => {
				const total = ctx.$input
					.all()
					.reduce((acc, i) => acc + (i.json as { value: number }).value, 0);
				return [{ json: { sum: total } }];
			});

			expect(result.jsCode).toBeDefined();
			expect(typeof result.jsCode).toBe('string');
			// The code should not contain 'ctx.' prefix - it's stripped
			expect(result.jsCode).not.toContain('ctx.');
			// Check for $input and .all() separately since they might be on different lines
			expect(result.jsCode).toContain('$input');
			expect(result.jsCode).toContain('.all()');
		});

		it('should strip ctx. prefix from code', () => {
			const result = runOnceForAllItems((ctx) => {
				return ctx.$input.all().map((item) => ({ json: item.json }));
			});

			expect(result.jsCode).toContain('$input.all()');
			expect(result.jsCode).not.toContain('ctx.$input');
		});
	});

	describe('runOnceForEachItem()', () => {
		it('should create a code helper with correct mode', () => {
			const result = runOnceForEachItem<{ doubled: number }>((ctx) => {
				const value = (ctx.$input.item.json as { value: number }).value;
				return { json: { doubled: value * 2 } };
			});

			expect(result.mode).toBe('runOnceForEachItem');
		});

		it('should serialize the function body', () => {
			const result = runOnceForEachItem<{ doubled: number }>((ctx) => {
				const value = (ctx.$input.item.json as { value: number }).value;
				return { json: { doubled: value * 2 } };
			});

			expect(result.jsCode).toBeDefined();
			expect(typeof result.jsCode).toBe('string');
			expect(result.jsCode).not.toContain('ctx.');
			expect(result.jsCode).toContain('$input.item');
		});

		it('should provide access to $itemIndex', () => {
			const result = runOnceForEachItem((ctx) => {
				return { json: { index: ctx.$itemIndex } };
			});

			expect(result.jsCode).toContain('$itemIndex');
		});
	});

	describe('context variables', () => {
		it('should strip ctx. from $env access', () => {
			const result = runOnceForAllItems((ctx) => {
				return [{ json: { key: ctx.$env.API_KEY } }];
			});

			expect(result.jsCode).toContain('$env.API_KEY');
			expect(result.jsCode).not.toContain('ctx.$env');
		});

		it('should strip ctx. from $vars access', () => {
			const result = runOnceForAllItems((ctx) => {
				return [{ json: { val: ctx.$vars.myVar } }];
			});

			expect(result.jsCode).toContain('$vars.myVar');
		});

		it('should strip ctx. from $execution access', () => {
			const result = runOnceForAllItems((ctx) => {
				return [{ json: { id: ctx.$execution.id } }];
			});

			expect(result.jsCode).toContain('$execution.id');
		});

		it('should strip ctx. from $workflow access', () => {
			const result = runOnceForAllItems((ctx) => {
				return [{ json: { name: ctx.$workflow.name } }];
			});

			expect(result.jsCode).toContain('$workflow.name');
		});

		it('should strip ctx. from node reference calls', () => {
			const result = runOnceForAllItems((ctx) => {
				return [{ json: { data: ctx('Config').json } }];
			});

			// ctx('Config') should become $('Config')
			expect(result.jsCode).toContain("$('Config')");
			expect(result.jsCode).not.toContain("ctx('Config')");
		});
	});
});
