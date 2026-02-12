import { serializeExpression, parseExpression, expr, createFromAIExpression } from './expression';

describe('Expression System', () => {
	describe('serializeExpression()', () => {
		it('should serialize simple json access', () => {
			const result = serializeExpression(($) => $.json.name);
			expect(result).toBe('={{ $json.name }}');
		});

		it('should serialize nested json access', () => {
			const result = serializeExpression(($) => ($.json.user as { email: string }).email);
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
			const result = serializeExpression(($) => ($.secrets.vault as { apiKey: string }).apiKey);
			expect(result).toBe('={{ $secrets.vault.apiKey }}');
		});

		it('should serialize binary field access', () => {
			const result = serializeExpression(($) => ($.binary.data as { fileName: string }).fileName);
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

	describe('expr() helper for expressions', () => {
		it('should add = prefix to expression with {{ }}', () => {
			const result = expr('{{ $json.name }}');
			expect(result).toBe('={{ $json.name }}');
		});

		it('should add = prefix to template with embedded expression', () => {
			const result = expr('Hello {{ $json.name }}');
			expect(result).toBe('=Hello {{ $json.name }}');
		});

		it('should strip leading = to prevent double-equals', () => {
			// Strip redundant = from LLM-generated expressions
			const result = expr('={{ $json.name }}');
			expect(result).toBe('={{ $json.name }}');
		});

		it('should handle multiline templates', () => {
			const input = `You are a helper.
- Email: {{ $json.email }}
- Name: {{ $json.name }}`;
			expect(expr(input)).toBe('=' + input);
		});

		it('should add = prefix to node reference expression', () => {
			const result = expr("{{ $('Config').item.json.apiUrl }}");
			expect(result).toBe("={{ $('Config').item.json.apiUrl }}");
		});

		it('should throw clear error when called with a PlaceholderValue', () => {
			const placeholderObj = { __placeholder: true, hint: 'Your API URL' };
			expect(() => expr(placeholderObj as unknown as string)).toThrow(
				"expr(placeholder('Your API URL')) is invalid. Use placeholder() directly as the value, not inside expr().",
			);
		});

		it('should throw clear error when called with a NewCredentialValue', () => {
			const credObj = { __newCredential: true, name: 'Slack Bot' };
			expect(() => expr(credObj as unknown as string)).toThrow(
				"expr(newCredential('Slack Bot')) is invalid. Use newCredential() directly in the credentials config, not inside expr().",
			);
		});

		it('should throw generic error for other non-string arguments', () => {
			expect(() => expr(123 as unknown as string)).toThrow(
				'expr() requires a string argument, but received number.',
			);
		});
	});

	describe('createFromAIExpression() key sanitization', () => {
		it('should sanitize keys with spaces', () => {
			const result = createFromAIExpression('user email');
			expect(result).toContain("$fromAI('user_email')");
		});

		it('should sanitize keys with special characters', () => {
			const result = createFromAIExpression('foo@bar');
			expect(result).toContain("$fromAI('foo_bar')");
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
