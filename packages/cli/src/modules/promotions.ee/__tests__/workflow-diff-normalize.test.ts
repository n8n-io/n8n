import type { PackageFile } from '../base-branch-files';
import { normalizeWorkflowHashes } from '../workflow-diff-normalize';

function workflowFile(path: string, blobSha = 'orig'): PackageFile {
	return {
		entityId: 'wf1',
		slug: 'wf',
		projectId: 'p1',
		fileName: 'workflow.json',
		path,
		blobSha,
		type: 'workflow',
	};
}

function nodeWithCredentialName(name: string): string {
	return JSON.stringify({
		nodes: [
			{
				id: 'n1',
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { slackApi: { id: 'c1', name } },
			},
		],
	});
}

describe('normalizeWorkflowHashes', () => {
	it('gives two workflows that differ only by credential name the same hash', () => {
		const [a] = normalizeWorkflowHashes(
			[workflowFile('a/workflow.json')],
			new Map([['a/workflow.json', nodeWithCredentialName('Old name')]]),
		);
		const [b] = normalizeWorkflowHashes(
			[workflowFile('b/workflow.json')],
			new Map([['b/workflow.json', nodeWithCredentialName('New name')]]),
		);
		expect(a.blobSha).toBe(b.blobSha);
	});

	it('keeps the original hash when there is no credential name to blank', () => {
		const content = JSON.stringify({ nodes: [{ id: 'n1', type: 'x', parameters: {} }] });
		const [result] = normalizeWorkflowHashes(
			[workflowFile('a/workflow.json', 'original-sha')],
			new Map([['a/workflow.json', content]]),
		);
		expect(result.blobSha).toBe('original-sha');
	});

	it('leaves non-workflow files untouched', () => {
		const file: PackageFile = {
			entityId: 'c1',
			slug: 'c',
			projectId: 'p1',
			fileName: 'credential.json',
			path: 'c/credential.json',
			blobSha: 'cred-sha',
			type: 'credential',
		};
		const [result] = normalizeWorkflowHashes([file], new Map([['c/credential.json', 'whatever']]));
		expect(result.blobSha).toBe('cred-sha');
	});

	it('still differs when content changes beyond the credential name', () => {
		const [a] = normalizeWorkflowHashes(
			[workflowFile('a/workflow.json')],
			new Map([['a/workflow.json', nodeWithCredentialName('Old name')]]),
		);
		const edited = JSON.stringify({
			nodes: [
				{
					id: 'n1',
					name: 'HTTP',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: { url: 'https://example.test' },
					credentials: { slackApi: { id: 'c1', name: 'New name' } },
				},
			],
		});
		const [b] = normalizeWorkflowHashes(
			[workflowFile('b/workflow.json')],
			new Map([['b/workflow.json', edited]]),
		);
		expect(a.blobSha).not.toBe(b.blobSha);
	});
});
