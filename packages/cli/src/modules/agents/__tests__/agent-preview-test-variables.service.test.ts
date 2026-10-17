import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { AgentPreviewTestVariablesService } from '../agent-preview-test-variables.service';

describe('AgentPreviewTestVariablesService', () => {
	afterEach(() => vi.useRealTimers());

	const create = (checkpointTtlSeconds: number) =>
		new AgentPreviewTestVariablesService(mock<AgentsConfig>({ checkpointTtlSeconds }));

	it('holds values for the checkpoint TTL when it is longer than the floor', () => {
		vi.useFakeTimers();
		const service = create(96 * 3600);
		service.hold('q', { tenant: 'acme' });
		vi.advanceTimersByTime(95 * 3600 * 1000);
		expect(service.take('q')).toEqual({ tenant: 'acme' });
	});

	it('expires values after the checkpoint TTL', () => {
		vi.useFakeTimers();
		const service = create(96 * 3600);
		service.hold('q', { tenant: 'acme' });
		vi.advanceTimersByTime(96 * 3600 * 1000 + 1);
		expect(service.take('q')).toBeUndefined();
	});

	it('keeps at least one hour when the checkpoint TTL is shorter', () => {
		vi.useFakeTimers();
		const service = create(60);
		service.hold('q', { tenant: 'acme' });
		vi.advanceTimersByTime(59 * 60 * 1000);
		expect(service.take('q')).toEqual({ tenant: 'acme' });
	});
});
