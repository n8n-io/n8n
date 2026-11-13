import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';
import { deepCopy } from 'n8n-workflow';

import {
	createAssistantTurnOptions,
	readAssistantTurnOptions,
	serializeAssistantTurnOptions,
} from '../assistant-turn-options';

describe('Assistant turn options', () => {
	it('keeps the client context and the resource references, but not the files', () => {
		const options = createAssistantTurnOptions({
			timeZone: 'Europe/Helsinki',
			pushRef: 'push-1',
			attachments: [
				{ type: 'file', data: 'aGVsbG8=', mimeType: 'text/plain', fileName: 'notes.txt' },
				{ type: 'workflow', id: 'wf-1', name: 'Digest' },
			],
		});

		expect(options.runId).toMatch(/^run_/);
		expect(options.messageGroupId).toMatch(/^mg_/);
		expect(options.request).toEqual({
			timeZone: 'Europe/Helsinki',
			pushRef: 'push-1',
			attachments: [{ type: 'workflow', id: 'wf-1', name: 'Digest' }],
		});
	});

	it('drops a client context that does not parse and logs the invalid fields', () => {
		const logger = mock<Logger>();

		expect(
			createAssistantTurnOptions({ browserUseAvailable: 'not-a-boolean' }, logger).request,
		).toEqual({});
		expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
			fields: ['browserUseAvailable'],
		});
		expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('not-a-boolean');
	});

	it('ignores the turn override fields in the client context and keeps the other fields', () => {
		const logger = mock<Logger>();

		const options = createAssistantTurnOptions(
			{
				timeZone: 'UTC',
				pushRef: 'push-1',
				browserUseAvailable: true,
				// Values that are not valid must not drop the other fields either.
				mode: 'not-a-mode',
				promptVersion: '',
				observerThresholdTokens: 1,
			},
			logger,
		);

		expect(options.request).toEqual({
			timeZone: 'UTC',
			pushRef: 'push-1',
			browserUseAvailable: true,
		});
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('ignores the turn override fields in stored options of older turns', () => {
		const options = readAssistantTurnOptions({
			runId: 'run-1',
			messageGroupId: 'mg-1',
			request: {
				timeZone: 'UTC',
				mode: 'progressive',
				promptVersion: 'default@1',
				observerThresholdTokens: 5_000,
			},
		});

		expect(options).toEqual({
			runId: 'run-1',
			messageGroupId: 'mg-1',
			request: { timeZone: 'UTC' },
		});
	});

	it('reads back what it stored, so a resume keeps its run id', () => {
		const options = createAssistantTurnOptions({ timeZone: 'UTC', pushRef: 'push-1' });

		const stored = deepCopy(serializeAssistantTurnOptions(options));

		expect(readAssistantTurnOptions(stored)).toEqual(options);
	});

	it('gives missing options new ids and no client context', () => {
		const options = readAssistantTurnOptions(undefined);

		expect(options.runId).toMatch(/^run_/);
		expect(options.messageGroupId).toMatch(/^mg_/);
		expect(options.request).toEqual({});
	});
});
