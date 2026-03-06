import { transpileWorkflowJS } from './compiler';
import { decompileWorkflowSDK } from './decompiler';
import { generateReport } from './generate-report';
import { loadFixtures } from './fixture-loader';
import { parseWorkflowCodeToBuilder } from '../codegen/parse-workflow-code';
import { validateWorkflow } from '../validation';
import { setupTestSchemas, teardownTestSchemas } from '../validation/test-schema-setup';

describe('transpileWorkflowJS', () => {
	afterAll(() => {
		generateReport();
	});

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
			expect(result.code).toContain('.first().json');
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
			expect(result.code).toContain('.first().json');
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
			// body should reference Webhook (trigger node name)
			expect(result.code).toContain("$('Webhook')");
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

	describe('Phase 8: loops', () => {
		it('should use native per-item processing for for...of with IO', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = await http.get('/items');
  for (const item of items) { await http.post('/process', item); }
});
`);
			expect(result.errors).toHaveLength(0);
			// Should NOT use SplitInBatches
			expect(result.code).not.toContain('splitInBatches(');
			// Should have a splitter Code node
			expect(result.code).toContain("type: 'n8n-nodes-base.code'");
			// Loop body HTTP node should NOT have executeOnce
			// Find the POST node config — it should lack executeOnce
			const postNodeMatch = result.code.match(
				/const http\d+ = node\(\{[^}]*"method": "POST"[\s\S]*?\}\);/,
			);
			expect(postNodeMatch).toBeTruthy();
			expect(postNodeMatch![0]).not.toContain('"executeOnce"');
		});

		it('should keep for...of without IO in Code node', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = await http.get('/items');
  let message = '';
  for (const item of items) { message += item.name; }
  await http.post('/result', { message });
});
`);
			expect(result.errors).toHaveLength(0);
			// No SplitInBatches, no aggregate — loop stays in Code node jsCode
			expect(result.code).not.toContain('splitInBatches(');
			expect(result.code).not.toContain('n8n-nodes-base.aggregate');
			expect(result.code).toContain('message += item.name');
		});

		it('should handle MemberExpression iterables in for...of', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const response = await http.get('https://api.example.com/data');
  for (const item of response.results) {
    await http.post('https://api.example.com/process', { id: item.id });
  }
});
`);
			expect(result.errors).toHaveLength(0);
			// Splitter should reference the full property chain
			expect(result.code).toContain('response.results.map(item');
			// Splitter should reference the source node for the root variable
			expect(result.code).toContain("$('");
		});

		it('should NOT add aggregate node when code follows a single-IO for...of loop', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = await http.get('/items');
  for (const item of items) { await http.post('/process', item); }
  await http.post('/done', { finished: true });
});
`);
			expect(result.errors).toHaveLength(0);
			// No aggregate — executeOnce on post-loop nodes handles it
			expect(result.code).not.toContain("type: 'n8n-nodes-base.aggregate'");
			// Post-loop node should have executeOnce (back to normal)
			expect(result.code).toContain('/done');
		});

		it('should wrap multi-IO loop body in Execute Sub-Workflow', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = await http.get('/items');
  for (const item of items) {
    await http.post('/step1', item);
    await http.get('/step2');
  }
});
`);
			expect(result.errors).toHaveLength(0);
			// Should have an Execute Workflow node (not inline per-item nodes)
			expect(result.code).toContain("type: 'n8n-nodes-base.executeWorkflow'");
			// Sub-workflow should have executeWorkflowTrigger
			expect(result.code).toContain("type: 'n8n-nodes-base.executeWorkflowTrigger'");
			// Sub-workflow name should start with _loop_
			expect(result.code).toContain("'_loop_item'");
			// Execute Workflow node should NOT have executeOnce (runs per item)
			const execMatch = result.code.match(
				/const exec\d+ = node\(\{[\s\S]*?executeWorkflow[\s\S]*?\}\);/,
			);
			expect(execMatch).toBeTruthy();
			expect(execMatch![0]).not.toContain('executeOnce');
			// No aggregate node
			expect(result.code).not.toContain("type: 'n8n-nodes-base.aggregate'");
		});

		it('should keep single-IO loop body inline (no sub-workflow)', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = await http.get('/items');
  for (const item of items) {
    await http.post('/process', item);
  }
});
`);
			expect(result.errors).toHaveLength(0);
			// Single IO: should NOT use Execute Workflow
			expect(result.code).not.toContain("type: 'n8n-nodes-base.executeWorkflow'");
			// Should have the splitter + inline HTTP node
			expect(result.code).toContain('Split items');
			expect(result.code).toContain('"method": "POST"');
		});

		it('should reference loop var from trigger inside sub-workflow', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const leads = await http.get('/leads');
  for (const lead of leads) {
    await http.post('/email', { to: lead.email });
    await http.put('/status', { id: lead.id, status: 'contacted' });
  }
});
`);
			expect(result.errors).toHaveLength(0);
			// Inside the sub-workflow, the loop var should reference the trigger node
			expect(result.code).toContain("$('When Executed by Another Workflow')");
		});

		it('should handle post-loop code after multi-IO loop without aggregate', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const items = await http.get('/items');
  for (const item of items) {
    await http.post('/step1', item);
    await http.get('/step2');
  }
  await http.post('/done', { finished: true });
});
`);
			expect(result.errors).toHaveLength(0);
			// No aggregate needed
			expect(result.code).not.toContain("type: 'n8n-nodes-base.aggregate'");
			// Post-loop node should have executeOnce
			expect(result.code).toContain('/done');
			// Main chain should go: ... splitter → exec → post-loop-http
			expect(result.code).toContain("type: 'n8n-nodes-base.executeWorkflow'");
		});
	});

	describe('Phase 9: switch/case', () => {
		it('should emit switchCase SDK code with rules', () => {
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
			expect(result.code).toContain("mode: 'rules'");
			expect(result.code).toContain('"values":');
			expect(result.code).toContain('"operation":"equals"');
			expect(result.code).toContain('.first().json.priority }}"');
			expect(result.code).toContain('"rightValue":"critical"');
			expect(result.code).toContain('"rightValue":"high"');
			expect(result.code).toContain('"fallbackOutput":"extra"');
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

		it('should recognize AssignmentExpression as IO call in try block', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  let existing = null;
  try {
    existing = await http.get('https://api.example.com/check');
  } catch {}
  if (!existing) {
    await http.post('https://api.example.com/create', { name: 'new' });
  }
});
`);
			expect(result.errors).toHaveLength(0);
			// The assignment should be extracted as a separate HTTP node with onError
			expect(result.code).toContain('"onError": "continueErrorOutput"');
			expect(result.code).toContain('"method": "GET"');
			// Should produce an IF node referencing the GET result
			expect(result.code).toContain('ifElse(');
		});

		it('should route catch body to error output for single-node try', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  try { await http.get('https://api.example.com'); }
  catch { await http.post('/error', { msg: 'failed' }); }
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('"onError": "continueErrorOutput"');
			// Should produce .onError() connection
			expect(result.code).toContain('.onError(');
			// Catch node should NOT be in the main .to() chain
			const mainChain = result.code.match(/\.add\(([^)]+)\)/)?.[1] ?? '';
			expect(mainChain).not.toContain('catch_');
		});

		it('should wrap multi-node try body in __tryCatch sub-workflow', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  try {
    const users = await http.get('https://api.example.com/users');
    await http.post('https://api.example.com/process', users);
  } catch {
    await http.post('/error', { msg: 'pipeline failed' });
  }
});
`);
			expect(result.errors).toHaveLength(0);
			// Should create a __tryCatch_ sub-workflow
			expect(result.code).toContain('__tryCatch_');
			expect(result.code).toContain('executeWorkflowTrigger');
			expect(result.code).toContain('"source": "parameter"');
			// The exec node should have onError
			expect(result.code).toContain('"onError": "continueErrorOutput"');
			// Should produce .onError() connection
			expect(result.code).toContain('.onError(');
		});

		it('should pass captured outer variables to multi-node try sub-workflow', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const config = { endpoint: 'https://api.com' };
  try {
    const data = await http.get(config.endpoint + '/users');
    await http.post(config.endpoint + '/process', data);
  } catch { await http.post('/error'); }
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('__tryCatch_');
			// Set node should capture config variable
			expect(result.code).toContain('Set __tryCatch_');
			expect(result.code).toContain('config');
		});

		it('should keep empty catch behavior unchanged for single node', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  try { await http.get('https://api.example.com'); }
  catch {}
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('"onError": "continueErrorOutput"');
			// No .onError() connection for empty catch
			expect(result.code).not.toContain('.onError(');
		});

		it('should keep empty catch behavior unchanged for multi-node try', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  try {
    const data = await http.get('https://api.example.com');
    await http.post('/process', data);
  } catch {}
});
`);
			expect(result.errors).toHaveLength(0);
			// Multi-node try with empty catch → sub-workflow but no error connection
			expect(result.code).toContain('__tryCatch_');
			expect(result.code).toContain('"onError": "continueErrorOutput"');
			expect(result.code).not.toContain('.onError(');
		});

		it('should support @onError continue annotation', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  // @onError continue
  const analysis = await new Agent({
    prompt: 'Analyze this email',
    model: new OpenAiModel({ model: 'gpt-4o' }),
  }).chat();
  await http.post('/result', analysis);
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("onError: 'continueRegularOutput'");
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

		it('should inline shared pipeline when multiple callbacks call same parameterless function', () => {
			const result = transpileWorkflowJS(`
async function process() {
  const data = await http.get('/data');
  await http.post('/result', { data });
}
onManual(async () => { await process(); });
onSchedule({ every: '1h' }, async () => { await process(); });
`);
			expect(result.errors).toHaveLength(0);
			// Should NOT have executeWorkflow nodes (inlined, not sub-workflow)
			expect(result.code).not.toContain('executeWorkflow');
			expect(result.code).not.toContain('executeWorkflowTrigger');
			// Should have 2 triggers and 2 .add() calls
			expect((result.code.match(/trigger\(/g) || []).length).toBe(2);
			expect((result.code.match(/\.add\(/g) || []).length).toBe(2);
			// First chain: trigger + full pipeline
			expect(result.code).toContain('.add(t0.to(http1).to(http2))');
			// Second chain: trigger connects to same first pipeline node (http1)
			expect(result.code).toMatch(/\.add\(t\d+\.to\(http1\)\)/);
		});
	});

	describe('Phase 13: AI class-based syntax', () => {
		it('should emit agent with OpenAI model via new Agent({...}).chat()', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const result = await new Agent({
    prompt: 'Analyze this data',
    model: new OpenAiModel({ model: 'gpt-4o' }),
  }).chat();
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.agent'");
			expect(result.code).toContain("text: 'Analyze this data'");
			expect(result.code).toContain("promptType: 'define'");
			expect(result.code).toContain('languageModel(');
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.lmChatOpenAi'");
			expect(result.code).toContain('"value":"gpt-4o"');
			expect(result.code).toContain('subnodes');
		});

		it('should emit agent with Google Gemini model (passthrough params)', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const result = await new Agent({
    prompt: 'Test',
    model: new GoogleGeminiModel({ modelName: 'gemini-pro' }),
  }).chat();
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini'");
			expect(result.code).toContain('"modelName":"gemini-pro"');
		});

		it('should emit agent with tools array', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await new Agent({
    prompt: 'Help user',
    model: new OpenAiModel({ model: 'gpt-4o' }),
    tools: [
      new CodeTool({ name: 'calc', description: 'Calculator', jsCode: 'return query * 2' }),
      new ThinkTool(),
      new WikipediaTool(),
    ],
  }).chat();
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.toolCode'");
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.toolThink'");
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.toolWikipedia'");
			expect(result.code).toContain('"name":"calc"');
		});

		it('should emit agent with outputParser and memory', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  await new Agent({
    prompt: 'Chat',
    model: new OpenAiModel({ model: 'gpt-4o' }),
    outputParser: new StructuredOutputParser({
      schemaType: 'fromJson',
      jsonSchemaExample: '{"items":"array","summary":"string"}',
    }),
    memory: new BufferWindowMemory({ contextWindowLength: 10 }),
  }).chat();
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('outputParser(');
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.outputParserStructured'");
			expect(result.code).toContain('"schemaType":"fromJson"');
			expect(result.code).toContain('memory(');
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.memoryBufferWindow'");
			expect(result.code).toContain('hasOutputParser: true');
		});

		it('should assign variable from Agent result', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const answer = await new Agent({
    prompt: 'What is 2+2?',
    model: new OpenAiModel({ model: 'gpt-4o' }),
  }).chat();
  await http.post('https://example.com/result', { answer: answer });
});
`);
			expect(result.errors).toHaveLength(0);
			// The HTTP node should reference the AI node output
			expect(result.code).toContain("type: '@n8n/n8n-nodes-langchain.agent'");
			expect(result.code).toContain("type: 'n8n-nodes-base.httpRequest'");
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

	describe('Phase 15: Set node for static assignments', () => {
		it('should emit Set node for single static string', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const x = "hello";
  await http.get('https://api.example.com');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.set'");
			expect(result.code).toContain('"name": "Set x"');
			expect(result.code).toContain('"type": "string"');
			expect(result.code).toContain('"value": "hello"');
			expect(result.code).toContain('.to(set1).to(http1)');
		});

		it('should emit Set node for multiple static scalars', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const x = "a";
  const y = 42;
  const z = true;
  await http.get('https://api.example.com');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.set'");
			expect(result.code).toContain('"name": "Set Variables 1"');
			expect(result.code).toContain('"type": "string"');
			expect(result.code).toContain('"type": "number"');
			expect(result.code).toContain('"type": "boolean"');
		});

		it('should emit Code node for mixed batch', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const x = "a";
  const y = x.length;
  await http.get('https://api.example.com');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.code'");
			expect(result.code).not.toContain("type: 'n8n-nodes-base.set'");
		});

		it('should emit Code node for object literal', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const cfg = { key: "val" };
  await http.get('https://api.example.com');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("type: 'n8n-nodes-base.code'");
			expect(result.code).not.toContain("type: 'n8n-nodes-base.set'");
		});

		it('should resolve expression from Set node variable', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const name = "test";
  if (name === "test") {
    await http.get('https://api.example.com');
  }
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain("$('Set name').first().json.name");
		});
	});

	describe('Phase 16: sub-functions', () => {
		it('should detect function declarations and emit executeWorkflow', () => {
			const result = transpileWorkflowJS(`
async function processOrder(orderId) {
  await http.get('https://api.com/' + orderId);
}
onManual(async () => {
  await processOrder('123');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('executeWorkflow');
			expect(result.code).toContain('executeWorkflowTrigger');
		});

		it('should error on recursive function calls', () => {
			const result = transpileWorkflowJS(`
async function loop(n) { await loop(n - 1); }
onManual(async () => { await loop(5); });
`);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain('ecursive');
		});

		it('should error on indirect recursion', () => {
			const result = transpileWorkflowJS(`
async function a() { await b(); }
async function b() { await a(); }
onManual(async () => { await a(); });
`);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should ignore non-async helper functions inside callbacks', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  const data = await http.get('/data');
  function sortKeys(obj) {
    return Object.keys(obj).sort().reduce((a, k) => ({ ...a, [k]: obj[k] }), {});
  }
  const sorted = sortKeys(data);
});
`);
			// Non-async, no IO → stays in Code node (Phase 14 behavior)
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('sortKeys');
			expect(result.code).not.toContain('executeWorkflow');
		});
	});

	describe('Phase 17: pin data via @example annotation', () => {
		it('should emit pinData in config when @example precedes http call', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  /** @example [{ id: 1, name: 'Alice' }] */
  const users = await http.get('https://api.example.com/users');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('pinData');
			expect(result.code).toContain('"id": 1');
			expect(result.code).toContain('"name": "Alice"');
		});

		it('should emit pinData for multi-line @example', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  /**
   * @example [
   *   { id: 1, name: 'Alice' },
   *   { id: 2, name: 'Bob' }
   * ]
   */
  const users = await http.get('https://api.example.com/users');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).toContain('pinData');
			expect(result.code).toContain('"id": 2');
			expect(result.code).toContain('"name": "Bob"');
		});

		it('should silently ignore malformed @example JSON', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  /** @example [{ broken json */
  const users = await http.get('https://api.example.com/users');
});
`);
			expect(result.errors).toHaveLength(0);
			expect(result.code).not.toContain('pinData');
		});

		it('should round-trip: compile with pinData → decompile → recompile produces same SDK', () => {
			// Pass 1: simplified → SDK₁
			const sdk1 = transpileWorkflowJS(`
onManual(async () => {
  /** @example [{ id: 1, name: 'Alice' }] */
  const users = await http.get('https://api.example.com/users');
  await http.post('https://api.example.com/result', { data: users });
});
`);
			expect(sdk1.errors).toHaveLength(0);
			expect(sdk1.code).toContain('pinData');

			// Decompile: SDK₁ → simplified₂
			const decompiled = decompileWorkflowSDK(sdk1.code);
			expect(decompiled.errors).toHaveLength(0);
			expect(decompiled.code).toContain('@example');

			// Pass 2: simplified₂ → SDK₂
			const sdk2 = transpileWorkflowJS(decompiled.code);
			expect(sdk2.errors).toHaveLength(0);

			// Compare: normalized SDK₁ === normalized SDK₂
			expect(normalizeSDK(sdk2.code)).toBe(normalizeSDK(sdk1.code));
		});

		it('should not consume @example for non-IO statements', () => {
			const result = transpileWorkflowJS(`
onManual(async () => {
  /** @example [{ id: 1 }] */
  const x = 42;
  await http.get('https://api.example.com/users');
});
`);
			expect(result.errors).toHaveLength(0);
			// The @example should not attach to the http call since
			// there's a non-IO statement between them
			expect(result.code).not.toContain('pinData');
		});
	});

	describe('Phase 18: trigger pin data via @example annotation', () => {
		it('should emit pinData in trigger config when @example precedes onWebhook', () => {
			const result = transpileWorkflowJS(`
/** @example [{ body: { orderId: 123, customer: "Alice" } }] */
onWebhook({ method: 'POST', path: '/orders' }, async ({ body }) => {
  await http.post('https://api.example.com/process', body);
});
`);
			expect(result.errors).toHaveLength(0);
			// pinData must be on the trigger() line, not an HTTP node
			const triggerLine = result.code.split('\n').find((l: string) => l.includes('trigger('));
			expect(triggerLine).toContain('pinData');
			expect(triggerLine).toContain('"orderId":123');
			expect(triggerLine).toContain('"customer":"Alice"');
			// The HTTP node should NOT have pinData
			const httpLine = result.code.split('\n').find((l: string) => l.includes('node('));
			expect(httpLine).not.toContain('pinData');
		});

		it('should emit pinData in trigger config when @example precedes onManual', () => {
			const result = transpileWorkflowJS(`
/** @example [{ id: 1, name: "Alice" }] */
onManual(async () => {
  await http.post('https://api.example.com/process', { test: true });
});
`);
			expect(result.errors).toHaveLength(0);
			const triggerLine = result.code.split('\n').find((l: string) => l.includes('trigger('));
			expect(triggerLine).toContain('pinData');
			expect(triggerLine).toContain('"id":1');
			expect(triggerLine).toContain('"name":"Alice"');
		});

		it('should NOT emit pinData when @example precedes onSchedule', () => {
			const result = transpileWorkflowJS(`
/** @example [{ id: 1, name: "Alice" }] */
onSchedule({ every: '1h' }, async () => {
  await http.get('https://api.example.com/users');
});
`);
			expect(result.errors).toHaveLength(0);
			const triggerLine = result.code.split('\n').find((l: string) => l.includes('trigger('));
			expect(triggerLine).not.toContain('pinData');
		});

		it('should round-trip: trigger pinData compile → decompile → recompile', () => {
			const sdk1 = transpileWorkflowJS(`
/** @example [{ id: 1, name: "Alice" }] */
onManual(async () => {
  await http.get('https://api.example.com/users');
});
`);
			expect(sdk1.errors).toHaveLength(0);
			const triggerLine = sdk1.code.split('\n').find((l: string) => l.includes('trigger('));
			expect(triggerLine).toContain('pinData');

			const decompiled = decompileWorkflowSDK(sdk1.code);
			expect(decompiled.errors).toHaveLength(0);
			expect(decompiled.code).toContain('@example');
			// @example should be before the onManual line
			const lines = decompiled.code.split('\n');
			const exampleIdx = lines.findIndex((l: string) => l.includes('@example'));
			const manualIdx = lines.findIndex((l: string) => l.includes('onManual'));
			expect(exampleIdx).toBeLessThan(manualIdx);

			const sdk2 = transpileWorkflowJS(decompiled.code);
			expect(sdk2.errors).toHaveLength(0);

			expect(normalizeSDK(sdk2.code)).toBe(normalizeSDK(sdk1.code));
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
				// simplified -> workflow-sdk
				const result = transpileWorkflowJS(fixture.input);
				expect(result.errors).toHaveLength(0);
				expect(result.code).toBe(fixture.expectedOutput);
			});
		}
	});

	describe('Round-trip: double-compile SDK equivalence', () => {
		const fixtures = loadFixtures();

		for (const fixture of fixtures) {
			const shouldSkip = fixture.skip ?? getRoundTripSkipReason(fixture.title);
			const testFn = shouldSkip ? it.skip : it;

			testFn(`${fixture.title} [round-trip]`, () => {
				// Pass 1: simplified -> SDK₁
				const sdk1 = transpileWorkflowJS(fixture.input);
				expect(sdk1.errors).toHaveLength(0);

				// Decompile: SDK₁ -> simplified₂
				const decompiled = decompileWorkflowSDK(sdk1.code);
				expect(decompiled.errors).toHaveLength(0);

				// Pass 2: simplified₂ -> SDK₂
				const sdk2 = transpileWorkflowJS(decompiled.code);
				expect(sdk2.errors).toHaveLength(0);

				// Compare: normalized SDK₁ === normalized SDK₂
				expect(normalizeSDK(sdk2.code)).toBe(normalizeSDK(sdk1.code));
			});
		}
	});
});

// ─── SDK normalization for structural comparison ────────────────────────────

function normalizeSDK(code: string): string {
	return code
		.replace(/,?\s*metadata:\s*\{[^}]*\}/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.split('\n')
		.map((line) => line.trimEnd())
		.join('\n')
		.trim();
}

// ─── Round-trip skip reasons ────────────────────────────────────────────────
// Double-compile: compile → decompile → recompile, compare normalized SDKs.
// Skip fixtures where the decompiler cannot yet produce valid simplified JS.

function getRoundTripSkipReason(_title: string): string | undefined {
	return undefined;
}

// ─── Schema validation: compiled SDK matches node parameter schemas ──────────

// Known schema violations in existing fixtures (to be fixed separately).
// Each entry maps fixture title substring to the reason.
const KNOWN_SCHEMA_VIOLATIONS: Record<string, string> = {};

function getKnownSchemaSkip(title: string): string | undefined {
	for (const [key, reason] of Object.entries(KNOWN_SCHEMA_VIOLATIONS)) {
		if (title.includes(key)) return `Known schema issue: ${reason}`;
	}
	return undefined;
}

describe('Schema validation: compiled SDK matches node schemas', () => {
	beforeAll(setupTestSchemas, 120_000);
	afterAll(teardownTestSchemas);

	const fixtures = loadFixtures();

	for (const fixture of fixtures) {
		const knownSkip = getKnownSchemaSkip(fixture.title);
		const shouldSkip = fixture.skip ?? knownSkip;
		const testFn = shouldSkip ? it.skip : it;

		testFn(`${fixture.title} [schema]`, () => {
			const sdk = transpileWorkflowJS(fixture.input);
			expect(sdk.errors).toHaveLength(0);

			const builder = parseWorkflowCodeToBuilder(sdk.code);
			const json = builder.toJSON();
			const result = validateWorkflow(json, { strictSchema: true });

			const schemaWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(schemaWarnings).toEqual([]);
		});
	}
});
