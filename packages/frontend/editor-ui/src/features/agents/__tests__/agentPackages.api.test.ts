import { getBrowserId } from '@n8n/constants';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { exportAgentPackage, importAgentPackage } from '../agentPackages.api';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/rest-api-client')>()),
	makeRestApiRequest: vi.fn(),
}));

const context = { baseUrl: '/rest', pushRef: 'tab-1' };

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('agent package requests', () => {
	it('downloads the binary server response with session headers and package policies', async () => {
		const blob = new Blob(['package bytes'], { type: 'application/gzip' });
		const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
		vi.stubGlobal('fetch', fetch);
		const options = { agentVersionPolicy: 'published-strict' as const };
		await expect(exportAgentPackage(context, 'project-1', 'agent-1', options)).resolves.toBe(blob);
		expect(fetch).toHaveBeenCalledWith('/rest/projects/project-1/agents/v2/agent-1/package', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'browser-id': getBrowserId(),
				'push-ref': 'tab-1',
				'Content-Type': 'application/json',
			},
			body: '{"agentVersionPolicy":"published-strict"}',
		});
	});

	it('preserves an export error instead of returning it as an archive', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				json: async () => ({ message: 'Export is not permitted' }),
			}),
		);
		await expect(exportAgentPackage(context, 'project-1', 'agent-1')).rejects.toMatchObject({
			message: 'Export is not permitted',
			httpStatusCode: 403,
		});
	});

	it('uploads the package with the shared multipart field names', async () => {
		const file = new File(['package bytes'], 'agent.n8np');
		await importAgentPackage(context, 'project-1', file, {
			agentConflictPolicy: 'skip',
			bindings: { credentials: { source: 'local' } },
		});
		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/projects/project-1/agents/v2/package',
			expect.any(FormData),
		);
		const data = vi.mocked(makeRestApiRequest).mock.calls[0][3] as FormData;
		expect(data.get('package')).toBe(file);
		expect(data.get('agentConflictPolicy')).toBe('skip');
		expect(data.get('bindings')).toBe('{"credentials":{"source":"local"}}');
	});
});
