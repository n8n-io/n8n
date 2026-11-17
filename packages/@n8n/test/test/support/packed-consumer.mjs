import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const consumer = createRequire(path.resolve(process.argv[2], 'package.json'));
process.chdir(process.argv[2]);
const directory = await mkdtemp(path.join(tmpdir(), 'n8n-packed-consumer-'));
process.env.N8N_USER_FOLDER = directory;
const { executeWorkflow, loadWorkflow, loadPackage, mockNode } = consumer('./');
const nock = consumer('nock');
const esm = await import(pathToFileURL(consumer.resolve('./')));
assert.equal(typeof esm.executeWorkflow, 'function');
const backend = await import(pathToFileURL(consumer.resolve('n8n/dist/testing.js')));
assert.equal(typeof backend.startPreparedWorkflow, 'function');

try {
	const definition = JSON.parse(
		await readFile(new URL('../fixtures/new-signup.json', import.meta.url), 'utf8'),
	);
	const workflow = loadWorkflow(definition);
	mockNode(workflow.node('Get customer'), [{ id: 42, name: 'Ada', plan: 'enterprise' }]);
	mockNode(workflow.node('Run sales workflow'), [{ notified: true }]);
	const result = await executeWorkflow(workflow, {
		input: { body: { customerId: 42 } },
		variables: { crmBaseUrl: 'https://crm.example.com' },
	});
	assert.deepEqual(result.output, [{ notified: true }]);
	const packaged = await loadPackage(
		fileURLToPath(new URL('../fixtures/packages/sales/', import.meta.url)),
	);
	const parent = packaged.get('New signup');
	mockNode(parent.node('Get customer'), [{ id: 42, name: 'Ada', plan: 'enterprise' }]);
	mockNode(packaged.get('Notify sales').node('Post to Slack'), [{ ok: true }]);
	const parentResult = await executeWorkflow(parent, {
		variables: { crmBaseUrl: 'https://crm.example.com' },
	});
	assert.deepEqual(parentResult.workflow('Notify sales').runs[0].output, [{ ok: true }]);
	const webhook = loadWorkflow(
		JSON.parse(
			await readFile(new URL('../fixtures/webhook-last-node.json', import.meta.url), 'utf8'),
		),
	);
	const response = await (await executeWorkflow(webhook, { input: { body: { quantity: 3 } } }))
		.response;
	assert.equal(response.status, 202);
	assert.deepEqual(response.body, { total: 15 });
	const code = loadWorkflow({
		id: 'packed-code',
		name: 'Packed Code',
		nodes: [
			{
				id: 'start',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'code',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [200, 0],
				parameters: {
					jsCode:
						"return [{ json: await this.helpers.httpRequest({ url: 'https://packed.example.com/value' }) }];",
				},
			},
		],
		connections: { Start: { main: [[{ node: 'Code', type: 'main', index: 0 }]] } },
	});
	nock('https://packed.example.com').get('/value').reply(200, { value: 42 });
	assert.deepEqual((await executeWorkflow(code)).output, [{ value: 42 }]);
	await writeFile(
		path.join(directory, 'manifest.json'),
		JSON.stringify({
			packageFormatVersion: '1',
			sourceN8nVersion: '2.49.0',
			sourceId: 'packed-consumer',
		}),
	);
	assert.deepEqual((await loadPackage(directory)).issues(), []);
	const repository = path.resolve(import.meta.dirname, '../../../../..');
	assert.equal(
		Object.keys(consumer.cache).some((file) => file.startsWith(`${repository}/`)),
		false,
	);
	console.log(
		'Packed consumer passed: CommonJS, ESM, workflow, child, webhook, Code HTTP, async package loading',
	);
} finally {
	nock.cleanAll();
	await rm(directory, { recursive: true });
}
