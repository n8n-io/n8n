import { serializeExpression, parseExpression, expr } from '../expression';

describe('Expression System', () => {
	describe('serializeExpression()', () => {
		it('should serialize simple json access', () => {
			const result = serializeExpression(($) => $.json.name);
			expect(result).toBe('={{ $json.name }}');
		});

		it('should serialize nested json access', () => {
			const result = serializeExpression(($) => $.json.user.email);
			expect(result).toBe('={{ $json.user.email }}');
		});

		it('should serialize env variable access', () => {
			const result = serializeExpression(($) => $.env.API_TOKEN);
			expect(result).toBe('={{ $env.API_TOKEN }}');
		});

		it('should serialize itemIndex', () => {
			const result = serializeExpression(($) => $.itemIndex);
			expect(result).toBe('={{ $itemIndex }}');
		});

		it('should serialize runIndex', () => {
			const result = serializeExpression(($) => $.runIndex);
			expect(result).toBe('={{ $runIndex }}');
		});

		it('should serialize now', () => {
			const result = serializeExpression(($) => $.now);
			expect(result).toBe('={{ $now }}');
		});

		it('should serialize execution.id', () => {
			const result = serializeExpression(($) => $.execution.id);
			expect(result).toBe('={{ $execution.id }}');
		});

		it('should serialize execution.mode', () => {
			const result = serializeExpression(($) => $.execution.mode);
			expect(result).toBe('={{ $execution.mode }}');
		});

		it('should serialize workflow.id', () => {
			const result = serializeExpression(($) => $.workflow.id);
			expect(result).toBe('={{ $workflow.id }}');
		});

		it('should serialize workflow.name', () => {
			const result = serializeExpression(($) => $.workflow.name);
			expect(result).toBe('={{ $workflow.name }}');
		});

		it('should serialize vars access', () => {
			const result = serializeExpression(($) => $.vars.myVar);
			expect(result).toBe('={{ $vars.myVar }}');
		});

		it('should serialize secrets access', () => {
			const result = serializeExpression(($) => $.secrets.vault.apiKey);
			expect(result).toBe('={{ $secrets.vault.apiKey }}');
		});

		it('should serialize binary field access', () => {
			const result = serializeExpression(($) => $.binary.data.fileName);
			expect(result).toBe('={{ $binary.data.fileName }}');
		});

		it('should serialize input.first()', () => {
			const result = serializeExpression(($) => $.input.first());
			expect(result).toBe('={{ $input.first() }}');
		});

		it('should serialize input.all()', () => {
			const result = serializeExpression(($) => $.input.all());
			expect(result).toBe('={{ $input.all() }}');
		});

		it('should serialize input.item', () => {
			const result = serializeExpression(($) => $.input.item);
			expect(result).toBe('={{ $input.item }}');
		});
	});

	describe('expr() helper for raw expressions', () => {
		it('should create raw n8n expression for node references', () => {
			const result = expr("$('Config').item.json.apiUrl");
			expect(result).toBe("={{ $('Config').item.json.apiUrl }}");
		});

		it('should create raw n8n expression for template literals', () => {
			const result = expr('`Bearer ${$env.API_TOKEN}`');
			expect(result).toBe('={{ `Bearer ${$env.API_TOKEN}` }}');
		});

		it('should create raw n8n expression for binary keys', () => {
			const result = expr('Object.keys($binary)[0]');
			expect(result).toBe('={{ Object.keys($binary)[0] }}');
		});

		it('should create raw n8n expression for complex operations', () => {
			const result = expr('$json.items.map(i => i.name).join(", ")');
			expect(result).toBe('={{ $json.items.map(i => i.name).join(", ") }}');
		});
	});

	describe('parseExpression()', () => {
		it('should parse simple json expression', () => {
			const result = parseExpression('={{ $json.name }}');
			expect(result).toBe('$json.name');
		});

		it('should parse node reference expression', () => {
			const result = parseExpression("={{ $('Config').item.json.apiUrl }}");
			expect(result).toBe("$('Config').item.json.apiUrl");
		});

		it('should parse template literal expression', () => {
			const result = parseExpression('={{ `Bearer ${$env.API_TOKEN}` }}');
			expect(result).toBe('`Bearer ${$env.API_TOKEN}`');
		});

		it('should return original for non-expression strings', () => {
			const result = parseExpression('just a regular string');
			expect(result).toBe('just a regular string');
		});

		it('should handle expressions without spacing', () => {
			const result = parseExpression('={{$json.name}}');
			expect(result).toBe('$json.name');
		});
	});
});
