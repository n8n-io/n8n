import {
	buildExampleFiles,
	type ManifestEntry,
	type ManifestFile,
	type RawTemplateBundle,
} from './examples-loader';
import type { WorkflowJSON } from './types/base';

function makeEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
	return {
		id: 42,
		slug: 'slack-daily-summary',
		name: 'Slack Daily Summary',
		description: 'untrusted prose',
		nodes: ['n8n-nodes-base.cron', 'n8n-nodes-base.slack'],
		tags: ['slack', 'reporting'],
		triggerType: 'schedule',
		hasAI: false,
		score: 80,
		source: 'n8n.io',
		author: 'someone',
		success: true,
		...overrides,
	};
}

function makeWorkflow(): WorkflowJSON {
	return {
		name: 'wf',
		nodes: [
			{
				id: '1',
				name: 'Manual',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
	} as unknown as WorkflowJSON;
}

function makeBundle(entries: ManifestEntry[]): RawTemplateBundle {
	const manifest: ManifestFile = { workflows: entries };
	const workflows = new Map<string, WorkflowJSON>();
	for (const entry of entries) workflows.set(entry.slug, makeWorkflow());
	return { manifest, workflows };
}

describe('buildExampleFiles', () => {
	it('emits one file + one index line per successful entry', () => {
		const bundle = makeBundle([
			makeEntry({ slug: 'a', score: 10 }),
			makeEntry({ slug: 'b', score: 90 }),
		]);
		const result = buildExampleFiles(bundle);

		expect(result.files.map((f) => f.filename)).toEqual(['b.ts', 'a.ts']);
		const indexLines = result.indexTxt.trim().split('\n');
		expect(indexLines).toHaveLength(2);
		for (const line of indexLines) {
			const parts = line.split(' | ');
			expect(parts).toHaveLength(5);
			expect(parts[0]).toMatch(/\.ts$/);
			expect(parts[4]).toMatch(/^n8n:\d+/);
		}
	});

	it('skips entries with success=false or skip=true', () => {
		const bundle = makeBundle([
			makeEntry({ slug: 'good' }),
			makeEntry({ slug: 'failed', success: false }),
			makeEntry({ slug: 'skipped', skip: true }),
		]);
		const result = buildExampleFiles(bundle);
		expect(result.files.map((f) => f.filename)).toEqual(['good.ts']);
	});

	it('skips entries whose workflow is missing from the bundle', () => {
		const entries = [makeEntry({ slug: 'present' }), makeEntry({ slug: 'absent', id: 99 })];
		const manifest: ManifestFile = { workflows: entries };
		const workflows = new Map<string, WorkflowJSON>();
		workflows.set('present', makeWorkflow()); // 'absent' deliberately omitted
		const result = buildExampleFiles({ manifest, workflows });
		expect(result.files.map((f) => f.filename)).toEqual(['present.ts']);
	});

	it('returns an empty bundle for an empty manifest', () => {
		const result = buildExampleFiles({
			manifest: { workflows: [] },
			workflows: new Map(),
		});
		expect(result.files).toEqual([]);
		expect(result.indexTxt).toBe('');
	});

	it('produces TS files with the expected shape', () => {
		const bundle = makeBundle([makeEntry()]);
		const [file] = buildExampleFiles(bundle).files;
		expect(file.content).toContain('@template');
		expect(file.content).toContain("from '@n8n/workflow-sdk'");
		expect(file.content).toContain('export default');
		expect(file.content).not.toContain('@description');
	});

	it('truncates the node list in the index when over 5 nodes', () => {
		const bundle = makeBundle([
			makeEntry({
				nodes: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
			}),
		]);
		expect(buildExampleFiles(bundle).indexTxt).toContain('a,b,c,d,e +2 more');
	});
});
