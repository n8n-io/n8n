import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import {
	fetchPrebuiltBuild,
	loadPrebuiltManifest,
	pickPrebuiltWorkflowId,
	type PrebuiltManifest,
} from '../harness/prebuilt-workflows';

describe('loadPrebuiltManifest', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'prebuilt-manifest-'));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	function writeManifest(content: unknown): string {
		const path = join(tmpDir, 'manifest.json');
		writeFileSync(path, JSON.stringify(content));
		return path;
	}

	it('parses a valid manifest', () => {
		const path = writeManifest({
			'contact-form-automation': ['W1', 'W2', 'W3'],
			'deduplication-trigger': ['W4'],
		});
		const manifest = loadPrebuiltManifest(path);
		expect(manifest['contact-form-automation']).toEqual(['W1', 'W2', 'W3']);
		expect(manifest['deduplication-trigger']).toEqual(['W4']);
	});

	it('rejects a manifest with no entries', () => {
		const path = writeManifest({});
		expect(() => loadPrebuiltManifest(path)).toThrow(/Invalid prebuilt-workflows manifest/);
	});

	it('rejects a manifest with empty ID arrays', () => {
		const path = writeManifest({ 'contact-form-automation': [] });
		expect(() => loadPrebuiltManifest(path)).toThrow(/Invalid prebuilt-workflows manifest/);
	});

	it('rejects malformed JSON with a clear error', () => {
		const path = join(tmpDir, 'bad.json');
		writeFileSync(path, '{ this is not json');
		expect(() => loadPrebuiltManifest(path)).toThrow(/Failed to read prebuilt-workflows manifest/);
	});

	it('rejects a missing file with a clear error', () => {
		const missingPath = join(tmpDir, 'does-not-exist.json');
		expect(() => loadPrebuiltManifest(missingPath)).toThrow(
			/Failed to read prebuilt-workflows manifest/,
		);
	});
});

describe('pickPrebuiltWorkflowId', () => {
	const manifest: PrebuiltManifest = {
		'contact-form-automation': ['W1', 'W2', 'W3'],
		'deduplication-trigger': ['Wsingle'],
	};

	it('returns the iteration-th ID for a known slug', () => {
		expect(pickPrebuiltWorkflowId(manifest, 'contact-form-automation', 0)).toBe('W1');
		expect(pickPrebuiltWorkflowId(manifest, 'contact-form-automation', 1)).toBe('W2');
		expect(pickPrebuiltWorkflowId(manifest, 'contact-form-automation', 2)).toBe('W3');
	});

	it('rotates through IDs when iteration exceeds list length', () => {
		expect(pickPrebuiltWorkflowId(manifest, 'contact-form-automation', 3)).toBe('W1');
		expect(pickPrebuiltWorkflowId(manifest, 'contact-form-automation', 4)).toBe('W2');
		expect(pickPrebuiltWorkflowId(manifest, 'deduplication-trigger', 7)).toBe('Wsingle');
	});

	it('returns undefined for an unknown slug', () => {
		expect(pickPrebuiltWorkflowId(manifest, 'never-heard-of-this', 0)).toBeUndefined();
	});

	it('returns undefined when manifest is undefined', () => {
		expect(pickPrebuiltWorkflowId(undefined, 'contact-form-automation', 0)).toBeUndefined();
	});
});

describe('fetchPrebuiltBuild', () => {
	const silentLogger: EvalLogger = {
		info: () => {},
		verbose: () => {},
		success: () => {},
		warn: () => {},
		error: () => {},
		isVerbose: false,
	};

	function makeClient(getWorkflow: jest.Mock): N8nClient {
		// Only the methods used by fetchPrebuiltBuild — narrow cast in test code is fine.
		return { getWorkflow } as unknown as N8nClient;
	}

	it('returns a successful BuildResult with the workflow JSON when fetch succeeds', async () => {
		const fakeWorkflow = {
			id: 'W123',
			name: 'fake',
			nodes: [{ id: 'n1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }],
			connections: {},
		} as unknown as WorkflowResponse;
		const getWorkflow = jest.fn().mockResolvedValue(fakeWorkflow);
		const client = makeClient(getWorkflow);

		const result = await fetchPrebuiltBuild(client, 'W123', silentLogger);

		expect(getWorkflow).toHaveBeenCalledWith('W123');
		expect(result.success).toBe(true);
		expect(result.workflowId).toBe('W123');
		expect(result.workflowJsons).toEqual([fakeWorkflow]);
		// Cleanup invariant — prebuilts must not be deleted on cleanupBuild
		expect(result.createdWorkflowIds).toEqual([]);
		expect(result.createdDataTableIds).toEqual([]);
		expect(result.error).toBeUndefined();
	});

	it('returns a failed BuildResult with the workflow ID in the error when fetch throws', async () => {
		const getWorkflow = jest.fn().mockRejectedValue(new Error('HTTP 404 Not Found'));
		const client = makeClient(getWorkflow);

		const result = await fetchPrebuiltBuild(client, 'Wstale', silentLogger);

		expect(result.success).toBe(false);
		expect(result.error).toContain('Wstale');
		expect(result.error).toContain('HTTP 404 Not Found');
		expect(result.workflowJsons).toEqual([]);
		expect(result.createdWorkflowIds).toEqual([]);
		expect(result.createdDataTableIds).toEqual([]);
	});

	it('coerces non-Error rejection values into a string in the error message', async () => {
		const getWorkflow = jest.fn().mockRejectedValue('plain string failure');
		const client = makeClient(getWorkflow);

		const result = await fetchPrebuiltBuild(client, 'Wodd', silentLogger);

		expect(result.success).toBe(false);
		expect(result.error).toContain('Wodd');
		expect(result.error).toContain('plain string failure');
	});
});
