import { describe, expect, it } from 'vitest';
import { resolveAccess, resolveOverride } from './resolve';

describe('resolveOverride', () => {
	it('follows the instance when the project sets nothing', () => {
		expect(resolveOverride('default', undefined, true)).toEqual({
			value: 'default',
			source: 'instance',
			instanceValue: 'default',
		});
	});

	it('uses the project value and keeps the instance value', () => {
		expect(resolveOverride('default', 'gpu', true)).toEqual({
			value: 'gpu',
			source: 'project',
			instanceValue: 'default',
		});
	});

	it('locks to the instance value when projects may not change it', () => {
		expect(resolveOverride('default', 'gpu', false)).toEqual({
			value: 'default',
			source: 'locked',
			instanceValue: 'default',
		});
	});

	it('is locked even when the project never set anything', () => {
		expect(resolveOverride('default', undefined, false).source).toBe('locked');
	});
});

describe('resolveAccess', () => {
	const none = { restricted: false, enabled: false };

	it('allowed by the instance follows the instance and can be restricted', () => {
		expect(resolveAccess('allowed', none)).toEqual({
			state: 'allowed',
			source: 'instance',
			action: 'restrict',
		});
	});

	it('restricted in the project can be allowed again', () => {
		expect(resolveAccess('allowed', { restricted: true, enabled: false })).toEqual({
			state: 'restricted',
			source: 'project',
			action: 'allow-again',
		});
	});

	it('restricted by the instance is locked, whatever the project says', () => {
		expect(resolveAccess('restricted', { restricted: false, enabled: true })).toEqual({
			state: 'restricted',
			source: 'locked',
			action: null,
		});
	});

	it('opt-in is not enabled until the project enables it', () => {
		expect(resolveAccess('opt-in', none)).toEqual({
			state: 'not-enabled',
			source: 'instance',
			action: 'enable',
		});
		expect(resolveAccess('opt-in', { restricted: false, enabled: true })).toEqual({
			state: 'allowed',
			source: 'project',
			action: 'disable',
		});
	});

	it('locks every row to the instance rule when projects may not change access', () => {
		expect(resolveAccess('allowed', { restricted: true, enabled: false }, false)).toEqual({
			state: 'allowed',
			source: 'locked',
			action: null,
		});
		expect(resolveAccess('opt-in', { restricted: false, enabled: true }, false)).toEqual({
			state: 'not-enabled',
			source: 'locked',
			action: null,
		});
	});
});
