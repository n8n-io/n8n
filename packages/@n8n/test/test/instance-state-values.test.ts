import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ExecuteWorkflowOptions } from '../src';
import { configureNode, executeWorkflow, loadWorkflow, mockNode } from '../src';
import newSignup from './fixtures/new-signup.json';
import definition from './fixtures/read-values.json';

async function read(expression: string, options: ExecuteWorkflowOptions = {}) {
	const workflow = loadWorkflow(definition);
	configureNode(workflow.node('Read'), { parameters: { jsonOutput: `={{ ${expression} }}` } });
	return await executeWorkflow(workflow, options);
}

test('reads a supplied variable', async () => {
	const result = await read('{ base: $vars.crmBaseUrl }', {
		variables: { crmBaseUrl: 'https://crm.example.com' },
	});

	expect(result.output).toEqual([{ base: 'https://crm.example.com' }]);
});

test('fails on a variable that the test did not supply and names it', async () => {
	await expect(read('{ base: $vars.crmBaseUrl }', { variables: {} })).rejects.toMatchObject({
		code: 'VARIABLE_NOT_SUPPLIED',
		message: expect.stringContaining('"crmBaseUrl"'),
	});
});

test('reads a null variable as undefined', async () => {
	const result = await read('{ missing: $vars.legacyFlag === undefined }', {
		variables: { legacyFlag: null },
	});

	expect(result.output).toEqual([{ missing: true }]);
});

test('reads a supplied env value and leaves process.env unchanged', async () => {
	const region = process.env.REGION;
	const result = await read('{ region: $env.REGION }', { env: { REGION: 'eu' } });

	expect(result.output).toEqual([{ region: 'eu' }]);
	expect(process.env.REGION).toBe(region);
});

test('blocks $env when the test supplies no env', async () => {
	await expect(read('{ home: $env.HOME }')).rejects.toMatchObject({
		code: 'NODE_FAILED',
		message: expect.stringContaining('access to env vars denied'),
	});
});

test('sets $now and $today from the now option', async () => {
	const result = await read('{ now: $now.toISO(), today: $today.toISO() }', {
		now: '2026-01-05T09:30:00Z',
	});

	expect(result.output).toEqual([
		{ now: '2026-01-05T09:30:00.000Z', today: '2026-01-05T00:00:00.000Z' },
	]);
});

test('fails on a variable that a mocked node reads and the test did not supply', async () => {
	const workflow = loadWorkflow(newSignup);
	mockNode(workflow.node('Get customer'), [{ id: 42, name: 'Ada', plan: 'enterprise' }]);
	mockNode(workflow.node('Run sales workflow'), [{ notified: true }]);

	await expect(
		executeWorkflow(workflow, { input: { body: { customerId: 42 } } }),
	).rejects.toMatchObject({
		code: 'VARIABLE_NOT_SUPPLIED',
		message: expect.stringContaining('"crmBaseUrl"'),
	});
});

test('restores the default time zone of luxon after the execution', async () => {
	const fromWorkflow = createRequire(require.resolve('n8n-workflow'));
	const esmEntry = path.join(path.dirname(fromWorkflow.resolve('luxon')), '../es6/luxon.mjs');
	const copies: Array<{ Settings: { defaultZone: { name: string } } }> = [
		fromWorkflow('luxon'),
		await import(pathToFileURL(esmEntry).href),
	];
	const before = copies.map((luxon) => luxon.Settings.defaultZone.name);

	await executeWorkflow(
		loadWorkflow({ ...definition, settings: { executionOrder: 'v1', timezone: 'Asia/Tokyo' } }),
	);

	expect(copies.map((luxon) => luxon.Settings.defaultZone.name)).toEqual(before);
});
