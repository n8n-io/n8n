import { MODAL_SESSION_HEADER, isModalModelEndpoint, withModalSession } from '../modal-session';

describe('isModalModelEndpoint', () => {
	it('accepts Modal public hostnames', () => {
		expect(isModalModelEndpoint('https://n8ngmbh--ep-kimi-k3-server.us-west.modal.direct/v1')).toBe(
			true,
		);
		expect(isModalModelEndpoint('https://my-app--server.modal.run/v1')).toBe(true);
	});

	it('rejects non-Modal and invalid URLs', () => {
		expect(isModalModelEndpoint('https://api.together.ai/v1')).toBe(false);
		expect(isModalModelEndpoint('https://modal.example.com/v1')).toBe(false);
		expect(isModalModelEndpoint('')).toBe(false);
		expect(isModalModelEndpoint(undefined)).toBe(false);
		expect(isModalModelEndpoint('not-a-url')).toBe(false);
	});
});

describe('withModalSession', () => {
	const modalConfig = {
		id: 'custom/moonshotai/Kimi-K3' as const,
		url: 'https://n8ngmbh--ep-kimi-k3-server.us-west.modal.direct/v1',
		apiKey: 'wk-test.ws-test',
	};

	it('adds Modal-Session-ID for Modal endpoint configs', () => {
		expect(withModalSession(modalConfig, 'thread-abc')).toEqual({
			...modalConfig,
			headers: { [MODAL_SESSION_HEADER]: 'thread-abc' },
		});
	});

	it('preserves existing headers and overwrites a prior Modal-Session-ID', () => {
		const withAuth = {
			...modalConfig,
			headers: { 'Modal-Key': 'wk-test', [MODAL_SESSION_HEADER]: 'old-thread' },
		};
		expect(withModalSession(withAuth, 'thread-new')).toEqual({
			...modalConfig,
			headers: {
				'Modal-Key': 'wk-test',
				[MODAL_SESSION_HEADER]: 'thread-new',
			},
		});
	});

	it('returns the same reference when the thread id is already set', () => {
		const sticky = withModalSession(modalConfig, 'thread-abc');
		expect(withModalSession(sticky, 'thread-abc')).toBe(sticky);
	});

	it('is a no-op for non-Modal endpoints and non-endpoint configs', () => {
		const databricks = {
			id: 'custom/workspace.default.kimi-k3' as const,
			url: 'https://dbc-a5846527-f2d2.cloud.databricks.com/ai-gateway/mlflow/v1',
			apiKey: 'dapi-test',
		};
		expect(withModalSession(databricks, 'thread-abc')).toBe(databricks);
		expect(withModalSession('anthropic/claude-opus-4-8', 'thread-abc')).toBe(
			'anthropic/claude-opus-4-8',
		);
		expect(withModalSession(modalConfig, '   ')).toBe(modalConfig);
	});
});
