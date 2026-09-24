import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockInstance } from 'vitest';
import * as apiUtils from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { editPreferenceCard, undoPreferenceCard } from '../instanceAi.api';

vi.mock('@n8n/rest-api-client');

// The card tests mock these wrappers, so the endpoint paths and bodies are pinned here.
describe('preference card API', () => {
	const context = { baseUrl: '/rest', pushRef: 'x' } as IRestApiContext;
	let makeRestApiRequestSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		makeRestApiRequestSpy = vi.spyOn(apiUtils, 'makeRestApiRequest');
	});

	it('undoPreferenceCard posts the run and tool call to the undo endpoint', async () => {
		const response = { ok: true, event: { type: 'preference-card' } };
		makeRestApiRequestSpy.mockResolvedValue(response);

		const result = await undoPreferenceCard(context, 'thread-1', 'pref-1', {
			runId: 'run-1',
			toolCallId: 'tc-1',
		});

		expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
			context,
			'POST',
			'/instance-ai/threads/thread-1/preferences/pref-1/undo',
			{ runId: 'run-1', toolCallId: 'tc-1' },
		);
		expect(result).toEqual(response);
	});

	it('editPreferenceCard posts the new text with the run and tool call to the edit endpoint', async () => {
		const response = { preference: { id: 'pref-1' }, event: { type: 'preference-card' } };
		makeRestApiRequestSpy.mockResolvedValue(response);

		const result = await editPreferenceCard(context, 'thread-1', 'pref-1', {
			runId: 'run-1',
			toolCallId: 'tc-1',
			content: 'Keep replies brief.',
		});

		expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
			context,
			'POST',
			'/instance-ai/threads/thread-1/preferences/pref-1/edit',
			{ runId: 'run-1', toolCallId: 'tc-1', content: 'Keep replies brief.' },
		);
		expect(result).toEqual(response);
	});
});
