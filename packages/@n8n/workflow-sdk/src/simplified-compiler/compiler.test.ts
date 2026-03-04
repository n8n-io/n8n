import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { transpileWorkflowJS } from './compiler';

// ─── Fixture helpers ────────────────────────────────────────────────────────

interface Fixture {
	title: string;
	input: string;
	expectedOutput: string;
	skip?: string;
}

interface FixtureMeta {
	title: string;
	skip?: string;
}

function loadFixtureFromDir(dirPath: string): Fixture {
	const meta = JSON.parse(readFileSync(join(dirPath, 'meta.json'), 'utf-8')) as FixtureMeta;
	const input = readFileSync(join(dirPath, 'input.js'), 'utf-8').trim();
	const expectedOutput = readFileSync(join(dirPath, 'output.js'), 'utf-8').trim();

	return { title: meta.title, input, expectedOutput, skip: meta.skip };
}

function loadFixtures(): Fixture[] {
	const dir = join(__dirname, '__fixtures__');
	return readdirSync(dir)
		.filter((f) => statSync(join(dir, f)).isDirectory())
		.sort()
		.map((f) => loadFixtureFromDir(join(dir, f)));
}

describe('transpileWorkflowJS', () => {
	describe('Phase 1: core transpiler', () => {
		it('should produce valid SDK code for simple workflow', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const data = await http.get('https://api.example.com');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('trigger({');
			expect(result.code).toContain('node({');
			expect(result.code).toContain('workflow(');
		});

		it('should generate $() references in Code nodes', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const users = await http.get('https://api.example.com/users');
  const names = users.map(u => u.name);
});
`);
			expect(result.code).toContain("$('");
			expect(result.code).toContain('.all()');
			expect(result.code).not.toContain('$input');
		});

		it('should set executeOnce on non-trigger nodes', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.get('https://api.example.com');
});
`);
			expect(result.code).toContain('"executeOnce": true');
		});

		it('should include node name comment in Code node jsCode', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const data = await http.get('https://api.example.com');
  const x = data.length;
});
`);
			expect(result.code).toContain('// From:');
		});

		it('should error on legacy trigger.X() syntax', () => {
			const result = transpileWorkflowJS(`
trigger.manual()
const data = await http.get('https://example.com');
`);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain('onManual');
		});

		it('should generate correct HTTP node config for GET', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const data = await http.get('https://api.example.com/users');
});
`);
			expect(result.code).toContain('"method": "GET"');
			expect(result.code).toContain('"url": "https://api.example.com/users"');
			expect(result.code).toContain("type: 'n8n-nodes-base.httpRequest'");
		});

		it('should generate correct HTTP node config for POST with body', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.post('https://api.example.com/data', { key: 'value' });
});
`);
			expect(result.code).toContain('"method": "POST"');
			expect(result.code).toContain('"sendBody": true');
		});

		it('should handle http.put, http.patch, http.delete', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.put('https://api.example.com/a', { x: 1 });
  await http.patch('https://api.example.com/b', { y: 2 });
  await http.delete('https://api.example.com/c');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('"method": "PUT"');
			expect(result.code).toContain('"method": "PATCH"');
			expect(result.code).toContain('"method": "DELETE"');
		});

		it('should chain nodes with .to()', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const a = await http.get('https://a.com');
  const b = await http.post('https://b.com', a);
});
`);
			expect(result.code).toContain('.to(');
		});

		it('should generate trigger node for onManual', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.get('https://api.example.com');
});
`);
			expect(result.code).toContain("type: 'n8n-nodes-base.manualTrigger'");
		});

		it('should use variable reference with $() in Code nodes', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const users = await http.get('https://api.example.com/users');
  const active = users.filter(u => u.active);
  await http.post('https://api.example.com/result', { active });
});
`);
			// Code node should reference previous HTTP node via $()
			expect(result.code).toContain("$('");
			expect(result.code).toContain('.all()');
		});

		it('should generate workflow export', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.get('https://api.example.com');
});
`);
			expect(result.code).toContain("workflow('compiled'");
			expect(result.code).toContain('.add(');
		});

		it('should handle multiple sequential HTTP calls', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const users = await http.get('https://api.example.com/users');
  const posts = await http.get('https://api.example.com/posts');
  await http.post('https://api.example.com/result', { users, posts });
});
`);
			expect(result.errors).toHaveLength(0);
			// Should have 3 HTTP nodes chained
			const httpMatches = result.code.match(/type: 'n8n-nodes-base\.httpRequest'/g);
			expect(httpMatches).toHaveLength(3);
		});

		it('should generate unique node variable names', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const a = await http.get('https://a.com');
  const b = await http.get('https://b.com');
});
`);
			// Should have distinct variable names like http1, http2
			expect(result.code).toMatch(/const http\d+ = node/);
		});

		it('should return parse errors for invalid JS', () => {
			const result = transpileWorkflowJS('onManual(async () => { const x = {{{ });');
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.code).toBe('');
		});

		it('should error when no onX callback is found', () => {
			const result = transpileWorkflowJS(`
const data = await http.get('https://example.com');
`);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain('onManual');
		});
	});

	describe('Phase 2: trigger callbacks', () => {
		it('should transpile onWebhook with body/headers', () => {
			const result = transpileWorkflowJS(`
onWebhook({ method: 'POST', path: '/orders' }, async ({ body, headers }) => {
  await http.post('/process', body);
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.webhook'");
			expect(result.code).toContain('"httpMethod":"POST"');
		});

		it('should transpile onSchedule with every', () => {
			const result = transpileWorkflowJS(`
onSchedule({ every: '5m' }, async () => {
  await http.get('https://api.example.com/check');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.scheduleTrigger'");
		});

		it('should transpile onSchedule with cron', () => {
			const result = transpileWorkflowJS(`
onSchedule({ cron: '0 9 * * *' }, async () => {
  await http.get('https://api.example.com/check');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.scheduleTrigger'");
			expect(result.code).toContain('cronExpression');
		});

		it('should transpile onError', () => {
			const result = transpileWorkflowJS(`
onError(async () => {
  await http.post('/slack', { text: 'Error' });
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.errorTrigger'");
		});

		it('should seed webhook params in varSourceMap', () => {
			const result = transpileWorkflowJS(`
onWebhook({ method: 'POST', path: '/orders' }, async ({ body }) => {
  const items = body.items;
  await http.post('/process', { items });
});
`);
			expect(result.errors).toHaveLength(0);
			// body should reference Start (trigger)
			expect(result.code).toContain("$('Start')");
		});
	});

	describe('Phase 3: deep IO scanning', () => {
		it('should detect IO inside if blocks', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  if (true) { await http.get('https://api.example.com'); }
});
`);
			expect(result.code).toContain("type: 'n8n-nodes-base.httpRequest'");
		});

		it('should detect IO inside try blocks', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  try { await http.get('https://api.example.com'); } catch (e) {}
});
`);
			expect(result.code).toContain("type: 'n8n-nodes-base.httpRequest'");
		});

		it('should detect IO inside for-of blocks', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = [1, 2, 3];
  for (const item of items) { await http.post('/process', { item }); }
});
`);
			expect(result.code).toContain("type: 'n8n-nodes-base.httpRequest'");
		});
	});

	describe('Phase 4: respond (webhook)', () => {
		it('should emit respondToWebhook node when respond() used', () => {
			const result = transpileWorkflowJS(`
onWebhook({ method: 'POST', path: '/orders' }, async ({ body, respond }) => {
  respond({ status: 200, body: { ok: true } });
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.respondToWebhook'");
			expect(result.code).toContain('"responseMode":"responseNode"');
		});

		it('should error when respond() in onManual', () => {
			const result = transpileWorkflowJS(`
onManual(async () => { respond({ status: 200 }); });
`);
			expect(result.errors[0].message).toContain('respond');
		});

		it('should support respond() with custom headers', () => {
			const result = transpileWorkflowJS(`
onWebhook({ method: 'POST', path: '/xml' }, async ({ body, respond }) => {
  respond({ status: 200, headers: { 'Content-Type': 'text/xml' }, body: '<ok/>' });
});
`);
			expect(result.code).toContain('responseHeaders');
			expect(result.code).toContain('Content-Type');
		});
	});

	describe('Phase 5: credentials', () => {
		it('should map bearer auth to credentials', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.get('https://api.example.com', { auth: { type: 'bearer', credential: 'My Key' } });
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('httpHeaderAuth');
			expect(result.code).toContain('My Key');
		});

		it('should map oauth2 auth to credentials', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.get('https://sheets.googleapis.com/v4/spreadsheets/ID', {
    auth: { type: 'oauth2', credential: 'Google Sheets' }
  });
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('oAuth2Api');
			expect(result.code).toContain('Google Sheets');
		});

		it('should map basic auth to credentials', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await http.get('https://api.example.com', { auth: { type: 'basic', credential: 'My Creds' } });
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('httpBasicAuth');
			expect(result.code).toContain('My Creds');
		});
	});

	describe('Phase 6: if/else', () => {
		it('should emit ifElse SDK code', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const order = await http.get('/order');
  if (order.status === 'paid') { await http.post('/fulfill', order); }
  else { await http.post('/cancel', order); }
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('ifElse(');
			expect(result.code).toContain('.onTrue(');
			expect(result.code).toContain('.onFalse(');
		});

		it('should handle else-if chains as nested IF nodes', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const data = await http.get('/data');
  if (data.priority === 'critical') {
    await http.post('/pagerduty', data);
  } else if (data.priority === 'high') {
    await http.post('/slack', data);
  } else {
    await http.post('/queue', data);
  }
});
`);
			const ifCount = (result.code.match(/ifElse\(/g) || []).length;
			expect(ifCount).toBe(2);
		});
	});

	describe('Phase 7: Promise.all', () => {
		it('should fan out to parallel nodes', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const d = await http.get('https://api.example.com');
  await Promise.all([http.post('/a', d), http.post('/b', d)]);
});
`);
			expect(result.errors).toHaveLength(0);
			// Multiple .to() calls from previous node
			expect(result.code).toMatch(/\.to\(http\d+\).*\.to\(http\d+\)/s);
		});
	});

	describe('Phase 8: loops', () => {
		it('should emit SplitInBatches', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = await http.get('/items');
  for (const item of items) { await http.post('/process', item); }
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('splitInBatches(');
		});
	});

	describe('Phase 9: switch/case', () => {
		it('should emit switchCase SDK code', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const t = await http.get('/ticket');
  switch (t.priority) {
    case 'critical': await http.post('/pagerduty', t); break;
    case 'high': await http.post('/slack', t); break;
    default: await http.post('/queue', t);
  }
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('switchCase(');
			expect(result.code).toContain('.onCase(');
		});
	});

	describe('Phase 10: try/catch', () => {
		it('should set onError on try-block nodes', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  try { await http.get('https://api.example.com'); }
  catch { await http.post('/error', { msg: 'failed' }); }
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('"onError": "continueErrorOutput"');
		});

		it('should support @onError continue annotation', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  // @onError continue
  const analysis = await ai.chat('gpt-4o', 'Analyze this email');
  await http.post('/result', analysis);
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('"onError": "continueRegularOutput"');
		});
	});

	describe('Phase 11: sub-workflows', () => {
		it('should emit executeWorkflow node', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const result = await workflow.run('Process Data', {});
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.executeWorkflow'");
		});
	});

	describe('Phase 12: multiple triggers', () => {
		it('should emit independent chains for multiple onX()', () => {
			const result = transpileWorkflowJS(`
onWebhook({ method: 'POST', path: '/api' }, async ({ body }) => {
  await http.post('/process', body);
});
onSchedule({ every: '1h' }, async () => {
  await http.get('/cleanup');
});
`);
			expect((result.code.match(/trigger\(/g) || []).length).toBe(2);
			expect((result.code.match(/\.add\(/g) || []).length).toBe(2);
		});
	});

	describe('Phase 13: AI subnodes', () => {
		it('should emit agent with tool subnodes', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await ai.chat('gpt-4o', 'Analyze', {
    tools: [{ type: 'code', name: 'calc', code: 'return 1+1' }],
  });
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('languageModel(');
			expect(result.code).toContain('tool(');
			expect(result.code).toContain('subnodes');
		});

		it('should emit outputParser and memory', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await ai.chat('gpt-4o', 'Chat', {
    outputParser: { type: 'structured', schema: { name: 'string' } },
    memory: { type: 'bufferWindow', contextLength: 5 },
  });
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('outputParser(');
			expect(result.code).toContain('memory(');
		});

		it('should map groq models', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await ai.chat('llama-3.1-70b', 'Test');
});
`);
			expect(result.code).toContain('lmChatGroq');
		});
	});

	describe('Phase 14: helper functions', () => {
		it('should include helper functions in Code node output', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const data = await http.get('/data');
  function sortKeys(obj) {
    return Object.keys(obj).sort().reduce((a, k) => ({ ...a, [k]: obj[k] }), {});
  }
  const sorted = sortKeys(data);
});
`);
			expect(result.code).toContain('sortKeys');
			expect(result.code).toContain('Object.keys(obj).sort()');
		});
	});

	// ─── Real-world workflow validation ──────────────────────────────────────
	// Fixture-driven tests: each .txt file in __fixtures__/ contains a title,
	// input DSL, and expected output separated by === markers. Files with a
	// ===skip=== section are skipped with the skip reason as the TODO.

	describe('Real-world workflow validation', () => {
		const fixtures = loadFixtures();

		for (const fixture of fixtures) {
			const testFn = fixture.skip ? it.skip : it;

			testFn(fixture.title, () => {
				const result = transpileWorkflowJS(fixture.input);
				expect(result.errors).toHaveLength(0);
				expect(result.code).toBe(fixture.expectedOutput);
			});
		}
	});
});
