import { request, requestResponse, ResponseError } from '@n8n/rest-api-client';

import { exportPackage, getImportBlockingIssues, importPackage } from './n8nPackages.api';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/rest-api-client')>()),
	request: vi.fn(),
	requestResponse: vi.fn(),
}));

const context = { baseUrl: 'http://localhost:5678/api/v1' };
const missingNodeType = {
	type: 'missing-node-type',
	nodeType: 'n8n-nodes-base.foo',
	typeVersion: 1,
	usedBy: [{ kind: 'agent', id: 'agent-1' }],
};

describe('n8nPackages.api', () => {
	it('posts the export body and returns the file blob', async () => {
		const blob = new Blob(['package']);
		vi.mocked(requestResponse).mockResolvedValue({ data: blob, headers: {} } as never);

		const result = await exportPackage(context, {
			agentIds: ['agent-1'],
			dependencyPolicy: 'include-in-package',
		});

		expect(result).toBe(blob);
		expect(requestResponse).toHaveBeenCalledWith({
			method: 'POST',
			baseURL: context.baseUrl,
			endpoint: '/n8n-packages/export',
			data: { agentIds: ['agent-1'], dependencyPolicy: 'include-in-package' },
			responseType: 'blob',
		});
	});

	it('sends the package file, conflict policy and project as form fields', async () => {
		vi.mocked(request).mockResolvedValue({ agents: [] });
		const file = new File(['package'], 'agent.n8np');

		await importPackage(context, file, { projectId: 'project-1', conflictPolicy: 'new-version' });

		const call = vi.mocked(request).mock.calls[0][0];
		expect(call).toMatchObject({
			method: 'POST',
			baseURL: context.baseUrl,
			endpoint: '/n8n-packages/import',
		});
		const formData = call.data as FormData;
		expect(formData.get('package')).toBeInstanceOf(File);
		expect(formData.get('conflictPolicy')).toBe('new-version');
		expect(formData.get('projectId')).toBe('project-1');
	});

	it.each([409, 422])('returns the issues of a blocked import with status %s', (status) => {
		const error = new ResponseError('Import blocked', {
			httpStatusCode: status,
			meta: { issues: [missingNodeType] },
		});

		expect(getImportBlockingIssues(error)).toEqual([missingNodeType]);
	});

	it('returns no issues for another status or a non-response error', () => {
		const serverError = new ResponseError('Server error', {
			httpStatusCode: 500,
			meta: { issues: [missingNodeType] },
		});

		expect(getImportBlockingIssues(serverError)).toBeUndefined();
		expect(getImportBlockingIssues(new Error('network'))).toBeUndefined();
	});
});
