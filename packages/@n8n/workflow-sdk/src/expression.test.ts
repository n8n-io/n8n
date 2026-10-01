import { parseExpression, expr, nodeJson, createFromAIExpression } from './expression';

describe('Expression System', () => {
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

		it('prepends = to a placeholder marker (preserves round-trip with `=marker`)', () => {
			const marker = '<__PLACEHOLDER_VALUE__Your API URL__>';
			expect(expr(marker)).toBe('=' + marker);
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

	describe('nodeJson() helper for explicit node references', () => {
		it('should build expression from a node instance and dot path', () => {
			const node = { name: 'Telegram Trigger' };

			const result = nodeJson(node as never, 'message.chat.id');

			expect(result).toBe("={{ $('Telegram Trigger').item.json.message.chat.id }}");
		});

		it('should build expression from a node name and array path', () => {
			const result = nodeJson('Set User', ['profile', 'user-id']);

			expect(result).toBe('={{ $(\'Set User\').item.json.profile["user-id"] }}');
		});

		it('should escape node names', () => {
			const result = nodeJson("Bob's Trigger", 'message.text');

			expect(result).toBe("={{ $('Bob\\'s Trigger').item.json.message.text }}");
		});

		it('should throw for an empty path', () => {
			expect(() => nodeJson('Set', '')).toThrow('nodeJson() requires a non-empty JSON path.');
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
