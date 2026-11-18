import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { discoverWorkflows } from '../workflow-rules/discover';
import { checkOffline, parseRulesBundle } from '../workflow-rules/evaluate-offline';
import { formatReport, shouldFail } from '../workflow-rules/report';

const httpNode = { id: 'h1', name: 'Call API', type: 'n8n-nodes-base.httpRequest', parameters: {} };

const bundle = {
	version: 1,
	exportedAt: '2026-11-18T00:00:00.000Z',
	defaults: { executionTimeout: -1 },
	instance: { rules: [{ ruleId: 'http-request-credential', severity: 'block' }] },
	projects: [
		{
			projectId: 'team-1',
			ruleSet: { rules: [{ ruleId: 'error-workflow-required', severity: 'warn' }] },
		},
	],
	exemptions: [{ workflowId: 'wf-exempt', ruleId: 'http-request-credential' }],
};

let root: string;

function write(relative: string, content: unknown) {
	const file = path.join(root, relative);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, JSON.stringify(content));
	return file;
}

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-rules-check-'));
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe('discoverWorkflows', () => {
	it('reads the source control layout and takes the project from the owner', () => {
		write('workflows/wf-1.json', {
			id: 'wf-1',
			name: 'Team flow',
			nodes: [httpNode],
			owner: { type: 'team', teamId: 'team-1', teamName: 'Ops' },
		});
		write('tags.json', { tags: [] });
		write('credential_stubs/c1.json', { id: 'c1', name: 'Key', type: 'httpHeaderAuth' });

		const { workflows } = discoverWorkflows([root]);

		expect(workflows).toHaveLength(1);
		expect(workflows[0]).toMatchObject({ projectId: 'team-1', workflow: { name: 'Team flow' } });
	});

	it('reads the n8n package layout and takes the project from project.json', () => {
		write('projects/ops-team-1/project.json', { id: 'team-1', name: 'Ops' });
		write('projects/ops-team-1/workflows/sync-wf-2/workflow.json', {
			id: 'wf-2',
			name: 'Package flow',
			nodes: [httpNode],
		});
		write('projects/ops-team-1/workflows/sync-wf-2/workflow-metadata.json', { versionId: 'v1' });

		const { workflows } = discoverWorkflows([root]);

		expect(workflows).toHaveLength(1);
		expect(workflows[0].projectId).toBe('team-1');
	});

	it('reports files that are not valid JSON', () => {
		fs.writeFileSync(path.join(root, 'broken.json'), '{');

		expect(discoverWorkflows([root]).unreadable).toHaveLength(1);
	});
});

describe('offline check', () => {
	it('applies instance rules, project rules and exemptions like the instance', () => {
		write('workflows/a.json', { id: 'wf-1', name: 'Personal', nodes: [httpNode] });
		write('workflows/b.json', {
			id: 'wf-2',
			name: 'Team',
			nodes: [],
			owner: { type: 'team', teamId: 'team-1' },
		});
		write('workflows/c.json', { id: 'wf-exempt', name: 'Exempt', nodes: [httpNode] });

		const report = checkOffline(
			parseRulesBundle(JSON.stringify(bundle)),
			discoverWorkflows([root]).workflows,
		);

		expect(
			report.results.map(({ workflowName, blocking, warnings }) => [
				workflowName,
				blocking,
				warnings,
			]),
		).toEqual([
			['Personal', 1, 0],
			['Team', 0, 1],
			['Exempt', 0, 0],
		]);
		expect(report.summary).toEqual({ workflows: 3, blocking: 1, warnings: 1, passed: false });
		expect(shouldFail(report, 'block')).toBe(true);
		expect(shouldFail(report, 'never')).toBe(false);
	});

	it('rejects a file that is not a rules export', () => {
		expect(() => parseRulesBundle('{"rules":[]}')).toThrow('not a Workflow Rules export');
	});
});

describe('formatReport', () => {
	it('prints GitHub annotations with the file and the rule', () => {
		const file = write('workflows/a.json', { id: 'wf-1', name: 'Personal', nodes: [httpNode] });
		const report = checkOffline(
			parseRulesBundle(JSON.stringify(bundle)),
			discoverWorkflows([file]).workflows,
		);

		const output = formatReport(report, 'github', 'block');

		expect(output).toContain('::error file=');
		expect(output).toContain(
			'title=Workflow rule http-request-credential::Node "Call API" sends requests without a credential',
		);
		expect(output).toContain(
			'::error title=Workflow Rules::1 workflow checked: 1 blocking, 0 warnings. Failed.',
		);
	});

	it('marks passing workflows in the text report', () => {
		const file = write('workflows/a.json', { id: 'wf-1', name: 'Clean', nodes: [] });
		const report = checkOffline(
			parseRulesBundle(JSON.stringify(bundle)),
			discoverWorkflows([file]).workflows,
		);

		expect(formatReport(report, 'text', 'block')).toMatch(/✔ .*Clean[\s\S]*Passed\./);
	});
});
