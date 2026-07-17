import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { CommandBarContribution } from './command';
import * as commandRegistry from './commandRegistry';

describe('commandRegistry', () => {
	const commandA: CommandBarContribution = { id: 'cmd-a', title: 'Command A' };
	const commandB: CommandBarContribution = {
		id: 'cmd-b',
		title: 'Command B',
		section: 'Navigation',
		keywords: ['jump'],
	};

	beforeEach(() => {
		commandRegistry.clear();
	});

	it('should register and retrieve a command', () => {
		commandRegistry.register(commandA);

		expect(commandRegistry.has('cmd-a')).toBe(true);
		expect(commandRegistry.get('cmd-a')).toEqual(commandA);
	});

	it('should return all registered commands in registration order', () => {
		commandRegistry.register(commandA);
		commandRegistry.register(commandB);

		expect(commandRegistry.getAll()).toEqual([commandA, commandB]);
	});

	it('should warn and skip when an id is registered twice', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		commandRegistry.register(commandA);
		commandRegistry.register(commandA);

		expect(consoleSpy).toHaveBeenCalledWith(
			'Command with id "cmd-a" is already registered. Skipping.',
		);
		expect(commandRegistry.getAll()).toHaveLength(1);

		consoleSpy.mockRestore();
	});

	it('should notify subscribers on register and unregister', () => {
		const listener = vi.fn();
		commandRegistry.subscribe(listener);

		commandRegistry.register(commandA);
		expect(listener).toHaveBeenLastCalledWith([commandA]);

		commandRegistry.unregister('cmd-a');
		expect(listener).toHaveBeenLastCalledWith([]);
	});

	it('should return an unsubscribe function that stops notifications', () => {
		const listener = vi.fn();
		const unsubscribe = commandRegistry.subscribe(listener);

		unsubscribe();
		commandRegistry.register(commandA);

		expect(listener).not.toHaveBeenCalled();
	});
});
