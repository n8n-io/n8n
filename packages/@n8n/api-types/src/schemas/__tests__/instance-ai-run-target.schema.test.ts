import {
	instanceAiThreadRunTargetSchema,
	InstanceAiSendMessageRequest,
	runTargetSchema,
} from '../instance-ai.schema';

const LINK_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';

describe('instanceAiThreadRunTargetSchema', () => {
	it('keeps the name of a stored linked target', () => {
		expect(
			instanceAiThreadRunTargetSchema.parse({ kind: 'linked', instanceId: LINK_ID, name: 'Office' }),
		).toEqual({ kind: 'linked', instanceId: LINK_ID, name: 'Office' });
	});

	it.each([
		['a linked target without a name', { kind: 'linked', instanceId: LINK_ID }],
		['a linked target with an empty name', { kind: 'linked', instanceId: LINK_ID, name: '' }],
		['a linked target whose id is not a uuid', { kind: 'linked', instanceId: 'office', name: 'x' }],
	])('rejects %s', (_label, value) => {
		expect(instanceAiThreadRunTargetSchema.safeParse(value).success).toBe(false);
	});
});

describe('runTargetSchema', () => {
	it('accepts a local target', () => {
		expect(runTargetSchema.parse({ kind: 'local' })).toEqual({ kind: 'local' });
	});

	it('accepts a linked target that names a link by its uuid', () => {
		expect(runTargetSchema.parse({ kind: 'linked', instanceId: LINK_ID })).toEqual({
			kind: 'linked',
			instanceId: LINK_ID,
		});
	});

	it.each([
		['an unknown kind', { kind: 'remote' }],
		['a linked target without an id', { kind: 'linked' }],
		['a linked target whose id is not a uuid', { kind: 'linked', instanceId: 'office' }],
		['a missing target', undefined],
	])('rejects %s', (_label, value) => {
		expect(runTargetSchema.safeParse(value).success).toBe(false);
	});
});

describe('InstanceAiSendMessageRequest.runTarget', () => {
	it('keeps a valid run target', () => {
		const parsed = InstanceAiSendMessageRequest.safeParse({
			timeZone: 'Europe/Helsinki',
			runTarget: { kind: 'linked', instanceId: LINK_ID },
		});

		expect(parsed.success).toBe(true);
		expect(parsed.success && parsed.data.runTarget).toEqual({
			kind: 'linked',
			instanceId: LINK_ID,
		});
	});

	it('treats an invalid run target as absent and keeps the rest of the request', () => {
		const parsed = InstanceAiSendMessageRequest.safeParse({
			timeZone: 'Europe/Helsinki',
			message: 'Hello',
			runTarget: { kind: 'linked', instanceId: 'not-a-uuid' },
		});

		expect(parsed.success).toBe(true);
		expect(parsed.success && parsed.data.runTarget).toBeUndefined();
		expect(parsed.success && parsed.data.message).toBe('Hello');
	});

	it('treats a missing run target as absent', () => {
		const parsed = InstanceAiSendMessageRequest.safeParse({ timeZone: 'Europe/Helsinki' });

		expect(parsed.success && parsed.data.runTarget).toBeUndefined();
	});
});
