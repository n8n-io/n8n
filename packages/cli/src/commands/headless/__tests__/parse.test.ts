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
const WORKFLOWS_ARRAY_FIXTURE = join(FIXTURES_DIR, 'workflows-array.json');
const WORKFLOWS_DIR_FIXTURE = join(FIXTURES_DIR, 'workflows-dir');

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

	it('returns multiple workflows from an array file in source order', async () => {
		const result = await parseWorkflowSource(WORKFLOWS_ARRAY_FIXTURE);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('Headless Array Workflow A');
		expect(result[1].name).toBe('Headless Array Workflow B');
	});

	it('throws UserError naming the offending index when one array element is invalid', async () => {
		const mixed = join(scratchDir, 'mixed.json');
		writeFileSync(
			mixed,
			JSON.stringify([
				{ name: 'valid', nodes: [], connections: {} },
				{ name: 'broken', connections: {} },
			]),
		);

		await expect(parseWorkflowSource(mixed)).rejects.toThrow(UserError);
		await expect(parseWorkflowSource(mixed)).rejects.toThrow(/\[1\]/);
		await expect(parseWorkflowSource(mixed)).rejects.toThrow(/nodes/);
	});

	it('parses every *.json file in a directory in lexicographic order', async () => {
		const result = await parseWorkflowSource(WORKFLOWS_DIR_FIXTURE);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('Headless Webhook Workflow');
		expect(result[1].name).toBe('Headless Schedule Workflow');
	});

	it('throws UserError naming the directory when no *.json files are present', async () => {
		await expect(parseWorkflowSource(scratchDir)).rejects.toThrow(UserError);
		await expect(parseWorkflowSource(scratchDir)).rejects.toThrow(/No \*\.json files found/);
		await expect(parseWorkflowSource(scratchDir)).rejects.toThrow(scratchDir);
	});

	it('ignores hidden files and non-JSON files when reading a directory', async () => {
		writeFileSync(join(scratchDir, '.DS_Store'), 'binary-noise');
		writeFileSync(join(scratchDir, 'README.md'), '# notes');
		writeFileSync(
			join(scratchDir, 'a.json'),
			JSON.stringify({ name: 'only-real', nodes: [], connections: {} }),
		);

		const result = await parseWorkflowSource(scratchDir);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('only-real');
	});

	it('concatenates array-files and single-object files in lexicographic order', async () => {
		writeFileSync(
			join(scratchDir, '01-single.json'),
			JSON.stringify({ name: 'single-A', nodes: [], connections: {} }),
		);
		writeFileSync(
			join(scratchDir, '02-array.json'),
			JSON.stringify([
				{ name: 'array-B-1', nodes: [], connections: {} },
				{ name: 'array-B-2', nodes: [], connections: {} },
			]),
		);
		writeFileSync(
			join(scratchDir, '03-single.json'),
			JSON.stringify({ name: 'single-C', nodes: [], connections: {} }),
		);

		const result = await parseWorkflowSource(scratchDir);

		expect(result.map((wf) => wf.name)).toEqual(['single-A', 'array-B-1', 'array-B-2', 'single-C']);
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

	it('returns multiple credentials from an array file in source order', async () => {
		const arrayFile = join(scratchDir, 'creds-array.json');
		writeFileSync(
			arrayFile,
			JSON.stringify([
				{ name: 'cred-A', type: 'httpHeaderAuth', data: { apiKey: 'a' } },
				{ name: 'cred-B', type: 'httpBasicAuth', data: { user: 'u', password: 'p' } },
			]),
		);

		const result = await parseCredentialsFile(arrayFile);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('cred-A');
		expect(result[1].name).toBe('cred-B');
	});

	it('throws UserError naming the offending index when one array element is invalid', async () => {
		const arrayFile = join(scratchDir, 'creds-mixed.json');
		writeFileSync(
			arrayFile,
			JSON.stringify([{ name: 'good', type: 'httpHeaderAuth', data: {} }, { name: 'bad' }]),
		);

		await expect(parseCredentialsFile(arrayFile)).rejects.toThrow(UserError);
		await expect(parseCredentialsFile(arrayFile)).rejects.toThrow(/\[1\]/);
	});

	it('throws "not yet supported" UserError when given a directory path', async () => {
		await expect(parseCredentialsFile(scratchDir)).rejects.toThrow(/not yet supported/);
	});
});
