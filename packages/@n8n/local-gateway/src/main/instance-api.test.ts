const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock('@n8n/computer-use/logger', () => ({
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { InstanceApi } from './instance-api';
import type { OAuthFlow } from './oauth/oauth-flow';

/** A minimal fetch Response double — `json()` is re-readable so error + unwrap paths can both call it. */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
	return {
		ok: init.ok ?? true,
		status: init.status ?? 200,
		json: vi.fn().mockResolvedValue(body),
	} as unknown as Response;
}

function makeOAuth(opts: { instanceUrl?: string | null; token?: string | null } = {}): OAuthFlow {
	return {
		getStatus: () => ({
			state: 'signedIn',
			instanceUrl: opts.instanceUrl === undefined ? 'https://n.example' : opts.instanceUrl,
			lastInstanceUrl: null,
			error: null,
		}),
		getValidAccessToken: vi.fn().mockResolvedValue(opts.token === undefined ? 'tok' : opts.token),
	} as unknown as OAuthFlow;
}

describe('InstanceApi', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', mockFetch);
		mockFetch.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('getTasks', () => {
		it('unwraps the data envelope, sends the bearer token, and absolutizes node icon urls', async () => {
			mockFetch.mockResolvedValue(
				jsonResponse({
					data: {
						actionNeeded: [
							{
								workflowId: 'a',
								name: 'A',
								description: '',
								icon: { type: 'node', nodeType: 'x', iconUrl: 'icons/x/x.svg' },
								trigger: { kind: 'manual' },
								source: 'user-built',
								active: false,
								runsLocally: false,
							},
						],
						upcoming: [],
						readyToRun: [],
					},
				}),
			);

			const tasks = await new InstanceApi(makeOAuth()).getTasks();

			const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
			expect(url).toBe('https://n.example/rest/desktop-assistant/tasks');
			expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
			// Relative icon path is made absolute against the signed-in instance.
			expect(tasks.actionNeeded[0].icon).toEqual({
				type: 'node',
				nodeType: 'x',
				iconUrl: 'https://n.example/icons/x/x.svg',
			});
		});

		it('throws a 401 without calling the network when signed out', async () => {
			const api = new InstanceApi(makeOAuth({ token: null }));
			await expect(api.getTasks()).rejects.toMatchObject({ status: 401 });
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('surfaces the server status and message on a failed request', async () => {
			mockFetch.mockResolvedValue(jsonResponse({ message: 'nope' }, { ok: false, status: 403 }));
			await expect(new InstanceApi(makeOAuth()).getTasks()).rejects.toThrow(/403.*nope/);
		});
	});

	describe('runWorkflow', () => {
		it('starts a full run from the workflow trigger node', async () => {
			mockFetch
				.mockResolvedValueOnce(
					jsonResponse({
						data: {
							nodes: [
								{ name: 'When clicking', type: 'n8n-nodes-base.manualTrigger' },
								{ name: 'Slack', type: 'n8n-nodes-base.slack' },
							],
						},
					}),
				)
				.mockResolvedValueOnce(jsonResponse({ data: { executionId: 'exec-1' } }));

			const result = await new InstanceApi(makeOAuth()).runWorkflow('wf-1');

			expect(result).toEqual({ executionId: 'exec-1' });
			expect(mockFetch.mock.calls[0][0]).toBe('https://n.example/rest/workflows/wf-1');
			const [runUrl, runInit] = mockFetch.mock.calls[1] as [string, RequestInit];
			expect(runUrl).toBe('https://n.example/rest/workflows/wf-1/run');
			expect(runInit.method).toBe('POST');
			expect(runInit.body).toBe(JSON.stringify({ triggerToStartFrom: { name: 'When clicking' } }));
		});

		it('falls back to an empty body when no trigger node is found', async () => {
			mockFetch
				.mockResolvedValueOnce(jsonResponse({ data: { nodes: [] } }))
				.mockResolvedValueOnce(jsonResponse({ data: {} }));

			await new InstanceApi(makeOAuth()).runWorkflow('wf-1');

			expect((mockFetch.mock.calls[1][1] as RequestInit).body).toBe('{}');
		});
	});

	describe('workflowUrl', () => {
		it('builds the editor url, or null when signed out', () => {
			expect(new InstanceApi(makeOAuth()).workflowUrl('wf-1')).toBe(
				'https://n.example/workflow/wf-1',
			);
			expect(new InstanceApi(makeOAuth({ instanceUrl: null })).workflowUrl('wf-1')).toBeNull();
		});
	});
});
