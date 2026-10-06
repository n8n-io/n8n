import { gitlabProjectPath, parseWorkflowFiles } from '../promotion-reviews.service';

describe('gitlabProjectPath', () => {
	it('strips the host, a base URL subpath, and the .git suffix', () => {
		expect(
			gitlabProjectPath(
				'https://gitlab.example.com/gitlab/platform/sub/api.git',
				'https://gitlab.example.com/gitlab',
			),
		).toBe('platform/sub/api');
		expect(
			gitlabProjectPath(
				'https://gitlab.example.com/platform/api.git',
				'https://gitlab.example.com/',
			),
		).toBe('platform/api');
	});

	it('reads an scp-like SSH remote', () => {
		expect(
			gitlabProjectPath('git@gitlab.example.com:platform/api.git', 'https://gitlab.example.com'),
		).toBe('platform/api');
	});

	it('rejects a remote without a namespace', () => {
		expect(() =>
			gitlabProjectPath('https://gitlab.example.com/api.git', 'https://gitlab.example.com'),
		).toThrow('does not name a GitLab project path');
	});
});

describe('parseWorkflowFiles', () => {
	const record = (blobSha: string, path: string) => `100644 blob ${blobSha}\t${path}`;

	it('keys workflow files by workflow id and reads the owning project', () => {
		const output = [
			record(
				'1'.repeat(40),
				'n8n-export/projects/platform-proj1/workflows/send-mail-wf1/workflow.json',
			),
			record(
				'2'.repeat(40),
				'n8n-export/projects/platform-proj1/workflows/send-mail-wf1/workflow-metadata.json',
			),
			record('3'.repeat(40), 'n8n-export/projects/platform-proj1/project.json'),
			record('4'.repeat(40), 'n8n-export/workflows/orphan-wf2/workflow.json'),
			'',
		].join('\0');

		const files = parseWorkflowFiles(output);

		expect([...files.keys()]).toEqual(['wf1', 'wf2']);
		expect(files.get('wf1')).toEqual({
			workflowId: 'wf1',
			path: 'n8n-export/projects/platform-proj1/workflows/send-mail-wf1/workflow.json',
			blobSha: '1'.repeat(40),
			projectId: 'proj1',
		});
		expect(files.get('wf2')?.projectId).toBeNull();
	});

	it('returns an empty map for an empty tree', () => {
		expect(parseWorkflowFiles('').size).toBe(0);
	});
});
