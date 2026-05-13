jest.unmock('node:fs');
jest.unmock('node:fs/promises');

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { UserError } from 'n8n-workflow';

import { parseCredentialsFile, parseWorkflowSource } from '../parse';

const FIXTURES_DIR = resolve(__dirname, '../../../../test/commands/headless/fixtures');
const WORKFLOW_FIXTURE = join(FIXTURES_DIR, 'workflow-manual.json');
const CREDENTIALS_FIXTURE = join(FIXTURES_DIR, 'credentials.json');

describe('parseWorkflowSource', () => {
	let scratchDir: string;

	beforeEach(() => {
		scratchDir = mkdtempSync(join(tmpdir(), 'parse-test-'));
	});

	afterEach(() => {
		rmSync(scratchDir, { recursive: true, force: true });
	});

	it('returns an array of length 1 for a single-object workflow file', async () => {
		const result = await parseWorkflowSource(WORKFLOW_FIXTURE);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Headless Manual Workflow');
		expect(Array.isArray(result[0].nodes)).toBe(true);
		expect(result[0].nodes).toHaveLength(2);
		expect(typeof result[0].connections).toBe('object');
	});

	it('throws UserError with the file path in the message for malformed JSON', async () => {
		const bogus = join(scratchDir, 'broken.json');
		writeFileSync(bogus, '{ this is not valid json');

		await expect(parseWorkflowSource(bogus)).rejects.toThrow(UserError);
		await expect(parseWorkflowSource(bogus)).rejects.toThrow(bogus);
	});

	it('throws UserError naming "nodes" when the field is missing', async () => {
		const missingNodes = join(scratchDir, 'no-nodes.json');
		writeFileSync(missingNodes, JSON.stringify({ name: 'x', connections: {} }));

		await expect(parseWorkflowSource(missingNodes)).rejects.toThrow(UserError);
		await expect(parseWorkflowSource(missingNodes)).rejects.toThrow(/nodes/);
	});

	it('throws UserError naming "connections" when the field is missing', async () => {
		const missingConnections = join(scratchDir, 'no-connections.json');
		writeFileSync(missingConnections, JSON.stringify({ name: 'x', nodes: [] }));

		await expect(parseWorkflowSource(missingConnections)).rejects.toThrow(UserError);
		await expect(parseWorkflowSource(missingConnections)).rejects.toThrow(/connections/);
	});

	it('throws "not yet supported" UserError when given an array top-level', async () => {
		const arrayFile = join(scratchDir, 'array.json');
		writeFileSync(arrayFile, JSON.stringify([{ name: 'a', nodes: [], connections: {} }]));

		await expect(parseWorkflowSource(arrayFile)).rejects.toThrow(/not yet supported/);
	});

	it('throws "not yet supported" UserError when given a directory path', async () => {
		await expect(parseWorkflowSource(scratchDir)).rejects.toThrow(/not yet supported/);
	});
});

describe('parseCredentialsFile', () => {
	let scratchDir: string;

	beforeEach(() => {
		scratchDir = mkdtempSync(join(tmpdir(), 'parse-creds-test-'));
	});

	afterEach(() => {
		rmSync(scratchDir, { recursive: true, force: true });
	});

	it('returns an array of length 1 for a single-object credentials file', async () => {
		const result = await parseCredentialsFile(CREDENTIALS_FIXTURE);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Headless Test Credential');
		expect(result[0].type).toBe('httpHeaderAuth');
		expect(result[0].data).toBeDefined();
	});

	it('throws UserError with the file path for malformed JSON', async () => {
		const bogus = join(scratchDir, 'broken-creds.json');
		writeFileSync(bogus, '{ totally not json');

		await expect(parseCredentialsFile(bogus)).rejects.toThrow(UserError);
		await expect(parseCredentialsFile(bogus)).rejects.toThrow(bogus);
	});

	it('throws UserError naming missing required fields', async () => {
		const missingFields = join(scratchDir, 'partial-cred.json');
		writeFileSync(missingFields, JSON.stringify({ name: 'only-name' }));

		await expect(parseCredentialsFile(missingFields)).rejects.toThrow(UserError);
		await expect(parseCredentialsFile(missingFields)).rejects.toThrow(/type/);
	});

	it('throws "not yet supported" UserError when given an array top-level', async () => {
		const arrayFile = join(scratchDir, 'creds-array.json');
		writeFileSync(arrayFile, JSON.stringify([{ name: 'a', type: 't', data: {} }]));

		await expect(parseCredentialsFile(arrayFile)).rejects.toThrow(/not yet supported/);
	});

	it('throws "not yet supported" UserError when given a directory path', async () => {
		await expect(parseCredentialsFile(scratchDir)).rejects.toThrow(/not yet supported/);
	});
});
