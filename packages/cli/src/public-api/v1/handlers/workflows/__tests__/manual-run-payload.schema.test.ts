import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { parsePublicApiManualRunPayload } from '../spec/manual-run-payload.schema';

describe('parsePublicApiManualRunPayload', () => {
	it('rejects undefined, null, arrays, and empty object', () => {
		expect(() => parsePublicApiManualRunPayload(undefined)).toThrow(BadRequestError);
		expect(() => parsePublicApiManualRunPayload(null)).toThrow(BadRequestError);
		expect(() => parsePublicApiManualRunPayload([])).toThrow(BadRequestError);
		expect(() => parsePublicApiManualRunPayload({})).toThrow(BadRequestError);
	});

	it('accepts known-trigger payload', () => {
		const body = { triggerToStartFrom: { name: 'Start' } };
		expect(parsePublicApiManualRunPayload(body)).toBe(body);
	});

	it('accepts known-trigger payload with optional fields', () => {
		const body = {
			triggerToStartFrom: { name: 'Start', data: { foo: 1 } },
			destinationNode: { nodeName: 'Set', mode: 'inclusive' as const },
		};
		expect(parsePublicApiManualRunPayload(body)).toBe(body);
	});

	it('accepts partial execution payload', () => {
		const body = {
			runData: { Cron: [] },
			destinationNode: { nodeName: 'Set', mode: 'inclusive' as const },
			dirtyNodeNames: ['Cron'],
		};
		expect(parsePublicApiManualRunPayload(body)).toBe(body);
	});

	it('accepts full execution from unknown trigger payload', () => {
		const body = {
			destinationNode: { nodeName: 'Set', mode: 'exclusive' as const },
		};
		expect(parsePublicApiManualRunPayload(body)).toBe(body);
	});

	it('rejects partial payload without dirtyNodeNames', () => {
		expect(() =>
			parsePublicApiManualRunPayload({
				runData: {},
				destinationNode: { nodeName: 'Set', mode: 'inclusive' },
			}),
		).toThrow(BadRequestError);
	});

	it('rejects unknown trigger payload with only invalid keys', () => {
		expect(() => parsePublicApiManualRunPayload({ foo: 'bar' })).toThrow(BadRequestError);
	});
});
