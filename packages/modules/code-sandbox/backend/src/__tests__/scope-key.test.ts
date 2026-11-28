import { buildExecutionScopeKey } from '../scope-key';

describe('buildExecutionScopeKey', () => {
	it('builds the key from the execution id', () => {
		expect(buildExecutionScopeKey('42', 'webhook')).toEqual({ value: 'e:42', singleUse: false });
	});

	it('adds a suffix for manual executions', () => {
		expect(buildExecutionScopeKey('42', 'manual')).toEqual({
			value: 'e:42:manual',
			singleUse: false,
		});
	});

	it('builds a new single-use key when the execution has no id', () => {
		const first = buildExecutionScopeKey(undefined, 'manual');
		const second = buildExecutionScopeKey(undefined, 'manual');

		expect(first).toEqual({ value: expect.stringMatching(/^r:[0-9a-f-]{36}$/), singleUse: true });
		expect(second.value).not.toBe(first.value);
	});
});
