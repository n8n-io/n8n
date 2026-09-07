import { mock } from 'vitest-mock-extended';

import { DuplicateOwnerResolverError, InvalidOwnerTypeError } from '../../errors';
import { ScheduledJobOwnerRegistry, type ScheduledJobOwnerResolver } from '../owner';

describe('ScheduledJobOwnerRegistry', () => {
	it('binds an owner type to its resolver', () => {
		const registry = new ScheduledJobOwnerRegistry();
		const resolver = mock<ScheduledJobOwnerResolver>();

		registry.register('workflow', resolver);

		expect(registry.has('workflow')).toBe(true);
		expect(registry.resolverFor('workflow')).toBe(resolver);
	});

	it('reports an unclaimed owner type as unregistered', () => {
		const registry = new ScheduledJobOwnerRegistry();

		expect(registry.has('agent')).toBe(false);
		expect(registry.resolverFor('agent')).toBeUndefined();
	});

	it('lists the claimed owner types', () => {
		const registry = new ScheduledJobOwnerRegistry();
		registry.register('workflow', mock<ScheduledJobOwnerResolver>());
		registry.register('system-task', mock<ScheduledJobOwnerResolver>());

		expect(registry.ownerTypes()).toEqual(['workflow', 'system-task']);
	});

	it('accepts the same resolver twice, so a module may register defensively', () => {
		const registry = new ScheduledJobOwnerRegistry();
		const resolver = mock<ScheduledJobOwnerResolver>();

		registry.register('workflow', resolver);

		expect(() => registry.register('workflow', resolver)).not.toThrow();
		expect(registry.resolverFor('workflow')).toBe(resolver);
	});

	it('refuses a second resolver for the same owner type, keeping the first', () => {
		const registry = new ScheduledJobOwnerRegistry();
		const first = mock<ScheduledJobOwnerResolver>();
		const second = mock<ScheduledJobOwnerResolver>();
		registry.register('workflow', first);

		expect(() => registry.register('workflow', second)).toThrow(DuplicateOwnerResolverError);
		expect(registry.resolverFor('workflow')).toBe(first);
	});

	it.each([
		['empty', ''],
		['wider than the column', 'a'.repeat(33)],
	])('refuses an owner type that is %s', (_case, ownerType) => {
		const registry = new ScheduledJobOwnerRegistry();

		expect(() => registry.register(ownerType, mock<ScheduledJobOwnerResolver>())).toThrow(
			InvalidOwnerTypeError,
		);
		expect(registry.has(ownerType)).toBe(false);
	});

	it('accepts an owner type exactly as wide as the column', () => {
		const registry = new ScheduledJobOwnerRegistry();
		const ownerType = 'a'.repeat(32);

		registry.register(ownerType, mock<ScheduledJobOwnerResolver>());

		expect(registry.has(ownerType)).toBe(true);
	});
});
