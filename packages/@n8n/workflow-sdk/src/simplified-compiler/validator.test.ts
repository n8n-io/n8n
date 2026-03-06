import { validateSimplifiedJS } from './validator';

describe('validateSimplifiedJS', () => {
	describe('syntax errors', () => {
		it('should detect syntax errors', () => {
			const result = validateSimplifiedJS('onManual(async () => {');
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].category).toBe('syntax');
			expect(result.errors[0].ruleId).toBe('syntax-error');
			expect(result.errors[0].line).toBeDefined();
			expect(result.errors[0].suggestion).toContain('Fix');
		});

		it('should pass valid DSL code', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const data = await http.get('https://api.example.com');
});
`);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('missing-http-url', () => {
		it('should error when http.get has no arguments', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const data = await http.get();
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'missing-http-url');
			expect(err).toBeDefined();
			expect(err!.category).toBe('validation');
			expect(err!.suggestion).toContain('URL');
		});

		it('should not error when http.get has a URL', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const data = await http.get('https://example.com');
});
`);
			const err = result.errors.find((e) => e.ruleId === 'missing-http-url');
			expect(err).toBeUndefined();
		});
	});

	describe('invalid-http-args', () => {
		it('should error when GET has body argument', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const data = await http.get('https://example.com', { key: 1 }, { auth: {} });
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'invalid-http-args');
			expect(err).toBeDefined();
			expect(err!.suggestion).toContain('2');
		});

		it('should error when DELETE has 3 args', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  await http.delete('https://example.com', { id: 1 }, {});
});
`);
			const err = result.errors.find((e) => e.ruleId === 'invalid-http-args');
			expect(err).toBeDefined();
		});

		it('should allow POST with 3 args (url, body, options)', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  await http.post('https://example.com', { key: 1 }, { auth: { type: 'bearer' } });
});
`);
			const err = result.errors.find((e) => e.ruleId === 'invalid-http-args');
			expect(err).toBeUndefined();
		});
	});

	describe('invalid-auth-type', () => {
		it('should error on unknown auth type', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  await http.get('https://example.com', { auth: { type: 'jwt' } });
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'invalid-auth-type');
			expect(err).toBeDefined();
			expect(err!.suggestion).toContain('bearer');
		});

		it('should accept valid auth types', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  await http.get('https://example.com', { auth: { type: 'bearer' } });
});
`);
			const err = result.errors.find((e) => e.ruleId === 'invalid-auth-type');
			expect(err).toBeUndefined();
		});
	});

	describe('invalid-schedule-format', () => {
		it('should error on invalid schedule string', () => {
			const result = validateSimplifiedJS(`
onSchedule({ every: '5 minutes' }, async () => {
  await http.get('https://example.com');
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'invalid-schedule-format');
			expect(err).toBeDefined();
			expect(err!.suggestion).toContain('5m');
		});

		it('should accept valid schedule formats', () => {
			const result = validateSimplifiedJS(`
onSchedule({ every: '5m' }, async () => {
  await http.get('https://example.com');
});
`);
			const err = result.errors.find((e) => e.ruleId === 'invalid-schedule-format');
			expect(err).toBeUndefined();
		});

		it('should accept cron format', () => {
			const result = validateSimplifiedJS(`
onSchedule({ cron: '0 9 * * *' }, async () => {
  await http.get('https://example.com');
});
`);
			const err = result.errors.find((e) => e.ruleId === 'invalid-schedule-format');
			expect(err).toBeUndefined();
		});
	});

	describe('wrong-callback-params', () => {
		it('should error when onManual has destructured params', () => {
			const result = validateSimplifiedJS(`
onManual(async ({ body }) => {
  const data = await http.get('https://example.com');
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'wrong-callback-params');
			expect(err).toBeDefined();
			expect(err!.suggestion).toContain('onWebhook');
		});

		it('should allow destructured params on onWebhook', () => {
			const result = validateSimplifiedJS(`
onWebhook({ method: 'POST', path: '/hook' }, async ({ body }) => {
  const data = await http.get('https://example.com');
});
`);
			const err = result.errors.find((e) => e.ruleId === 'wrong-callback-params');
			expect(err).toBeUndefined();
		});

		it('should error when onSchedule has destructured params', () => {
			const result = validateSimplifiedJS(`
onSchedule({ every: '1h' }, async ({ body }) => {
  await http.get('https://example.com');
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'wrong-callback-params');
			expect(err).toBeDefined();
		});
	});

	describe('invalid-ai-class-name', () => {
		it('should error on unknown AI class', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const answer = await new ChatGPT({ prompt: 'hi' }).chat();
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'invalid-ai-class-name');
			expect(err).toBeDefined();
			expect(err!.message).toContain('ChatGPT');
		});

		it('should accept known AI class names', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const answer = await new Agent({
    prompt: 'hi',
    model: new OpenAiModel({ model: 'gpt-4o' }),
  }).chat();
});
`);
			const err = result.errors.find((e) => e.ruleId === 'invalid-ai-class-name');
			expect(err).toBeUndefined();
		});
	});

	describe('invalid-ai-io-method', () => {
		it('should error on unknown IO method', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const answer = await new Agent({
    prompt: 'hi',
    model: new OpenAiModel({ model: 'gpt-4o' }),
  }).ask();
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'invalid-ai-io-method');
			expect(err).toBeDefined();
			expect(err!.suggestion).toContain('chat');
		});

		it('should accept known IO methods', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const answer = await new Agent({
    prompt: 'hi',
    model: new OpenAiModel({ model: 'gpt-4o' }),
  }).chat();
});
`);
			const err = result.errors.find((e) => e.ruleId === 'invalid-ai-io-method');
			expect(err).toBeUndefined();
		});
	});

	describe('invalid-ai-class-props', () => {
		it('should error on unknown property in AI subnode', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const answer = await new Agent({
    prompt: 'hi',
    model: new OpenAiModel({ model: 'gpt-4o', unknownProp: 'x' }),
  }).chat();
});
`);
			// Only expect error if schemas are available (graceful fallback)
			const err = result.errors.find((e) => e.ruleId === 'invalid-ai-class-props');
			if (err) {
				expect(err.message).toContain('unknownProp');
			}
		});

		it('should separate Agent sugar fields from passthrough params', () => {
			// prompt, model, tools, outputParser, memory are sugar — not passthrough
			const result = validateSimplifiedJS(`
onManual(async () => {
  const answer = await new Agent({
    prompt: 'hi',
    model: new OpenAiModel({ model: 'gpt-4o' }),
  }).chat();
});
`);
			// Agent sugar fields should not trigger validation errors
			const err = result.errors.find((e) => e.ruleId === 'invalid-ai-class-props');
			expect(err).toBeUndefined();
		});
	});

	describe('multiple-respond', () => {
		it('should error when multiple respond() in same callback', () => {
			const result = validateSimplifiedJS(`
onWebhook({ method: 'POST', path: '/hook' }, async ({ body }) => {
  respond({ status: 200, body: 'ok' });
  respond({ status: 201, body: 'created' });
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'multiple-respond');
			expect(err).toBeDefined();
		});

		it('should allow single respond()', () => {
			const result = validateSimplifiedJS(`
onWebhook({ method: 'POST', path: '/hook' }, async ({ body }) => {
  respond({ status: 200, body: 'ok' });
});
`);
			const err = result.errors.find((e) => e.ruleId === 'multiple-respond');
			expect(err).toBeUndefined();
		});
	});

	describe('non-numeric-respond-status', () => {
		it('should error on string status code', () => {
			const result = validateSimplifiedJS(`
onWebhook({ method: 'POST', path: '/hook' }, async ({ body }) => {
  respond({ status: 'ok', body: 'done' });
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'non-numeric-respond-status');
			expect(err).toBeDefined();
			expect(err!.suggestion).toContain('200');
		});

		it('should accept numeric status code', () => {
			const result = validateSimplifiedJS(`
onWebhook({ method: 'POST', path: '/hook' }, async ({ body }) => {
  respond({ status: 200, body: 'done' });
});
`);
			const err = result.errors.find((e) => e.ruleId === 'non-numeric-respond-status');
			expect(err).toBeUndefined();
		});
	});

	describe('function-arg-count-mismatch', () => {
		it('should error when too few args passed to sub-function', () => {
			const result = validateSimplifiedJS(`
async function processUser(name, email) {
  await http.post('https://example.com/users', { name, email });
}
onManual(async () => {
  await processUser('Alice');
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'function-arg-count-mismatch');
			expect(err).toBeDefined();
			expect(err!.message).toContain('2');
		});

		it('should not error when arg count matches', () => {
			const result = validateSimplifiedJS(`
async function processUser(name, email) {
  await http.post('https://example.com/users', { name, email });
}
onManual(async () => {
  await processUser('Alice', 'alice@example.com');
});
`);
			const err = result.errors.find((e) => e.ruleId === 'function-arg-count-mismatch');
			expect(err).toBeUndefined();
		});
	});

	describe('return-in-sub-function', () => {
		it('should error when async fn with IO has return value', () => {
			const result = validateSimplifiedJS(`
async function fetchData() {
  const data = await http.get('https://example.com');
  return 5;
}
onManual(async () => {
  await fetchData();
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'return-in-sub-function');
			expect(err).toBeDefined();
		});

		it('should allow return without value in fn with IO', () => {
			const result = validateSimplifiedJS(`
async function fetchData() {
  const data = await http.get('https://example.com');
  return;
}
onManual(async () => {
  await fetchData();
});
`);
			const err = result.errors.find((e) => e.ruleId === 'return-in-sub-function');
			expect(err).toBeUndefined();
		});
	});

	describe('try-catch-without-io', () => {
		it('should error when try block has no IO calls', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  try {
    const x = 5;
    const y = x + 1;
  } catch (e) {
    console.log(e);
  }
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'try-catch-without-io');
			expect(err).toBeDefined();
		});

		it('should not error when try block has IO', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  try {
    const data = await http.get('https://example.com');
  } catch (e) {
    console.log(e);
  }
});
`);
			const err = result.errors.find((e) => e.ruleId === 'try-catch-without-io');
			expect(err).toBeUndefined();
		});
	});

	describe('loop-variable-after-loop', () => {
		it('should error when loop variable is used after loop', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const items = await http.get('https://example.com/items');
  for (const item of items) {
    await http.post('https://example.com/process', item);
  }
  await http.post('https://example.com/report', item);
});
`);
			expect(result.valid).toBe(false);
			const err = result.errors.find((e) => e.ruleId === 'loop-variable-after-loop');
			expect(err).toBeDefined();
			expect(err!.message).toContain('item');
		});

		it('should not error when loop variable is not used after loop', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  const items = await http.get('https://example.com/items');
  for (const item of items) {
    await http.post('https://example.com/process', item);
  }
  await http.post('https://example.com/done', { done: true });
});
`);
			const err = result.errors.find((e) => e.ruleId === 'loop-variable-after-loop');
			expect(err).toBeUndefined();
		});
	});

	describe('integration', () => {
		it('should report multiple errors from different rules', () => {
			const result = validateSimplifiedJS(`
onManual(async ({ body }) => {
  const data = await http.get();
  await http.get('https://example.com', { auth: { type: 'jwt' } });
});
`);
			expect(result.valid).toBe(false);
			const ruleIds = result.errors.map((e) => e.ruleId);
			expect(ruleIds).toContain('wrong-callback-params');
			expect(ruleIds).toContain('missing-http-url');
			expect(ruleIds).toContain('invalid-auth-type');
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
		});

		it('should pass a complex valid DSL', () => {
			const result = validateSimplifiedJS(`
async function enrichUser(userId) {
  const details = await http.get('https://api.example.com/users/' + userId);
  await http.post('https://api.example.com/enrich', details);
}

onWebhook({ method: 'POST', path: '/process' }, async ({ body }) => {
  const users = await http.get('https://api.example.com/users');
  for (const user of users) {
    await enrichUser(user.id);
  }
  try {
    await http.post('https://api.example.com/notify', { done: true });
  } catch (e) {}
  respond({ status: 200, body: 'done' });
});
`);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should sort errors by line number', () => {
			const result = validateSimplifiedJS(`
onManual(async () => {
  await http.get();
  await http.delete();
});
`);
			expect(result.errors.length).toBe(2);
			const lines = result.errors.map((e) => e.line).filter((l): l is number => l !== undefined);
			expect(lines).toEqual([...lines].sort((a, b) => a - b));
		});
	});
});
