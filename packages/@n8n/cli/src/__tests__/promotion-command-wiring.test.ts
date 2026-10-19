import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PromotionEnvironmentAddProject from '../commands/promotion-environment/add-project';
import PromotionEnvironmentClone from '../commands/promotion-environment/clone';
import PromotionEnvironmentCreate from '../commands/promotion-environment/create';
import PromotionEnvironmentDelete from '../commands/promotion-environment/delete';
import PromotionEnvironmentDeleteConfig from '../commands/promotion-environment/delete-config';
import PromotionEnvironmentDisconnect from '../commands/promotion-environment/disconnect';
import PromotionEnvironmentGet from '../commands/promotion-environment/get';
import PromotionEnvironmentListChanges from '../commands/promotion-environment/list-changes';
import PromotionEnvironmentListProjects from '../commands/promotion-environment/list-projects';
import PromotionEnvironmentRemoveProject from '../commands/promotion-environment/remove-project';
import PromotionEnvironmentSetConfig from '../commands/promotion-environment/set-config';
import PromotionEnvironmentUpdate from '../commands/promotion-environment/update';
import PromotionProviderDelete from '../commands/promotion-provider/delete';
import PromotionProviderGet from '../commands/promotion-provider/get';
import PromotionProviderList from '../commands/promotion-provider/list';
import PromotionProviderUpdate from '../commands/promotion-provider/update';

type CommandClass = new (argv: string[], config: Config) => { run: () => Promise<void> };

function instantiate(commandClass: CommandClass) {
	return new commandClass([], {} as Config);
}

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface Internals {
	parse: () => Promise<{ args: Record<string, string>; flags: Record<string, unknown> }>;
	readInput: () => string;
	getClient: () => N8nClient;
	output: (data: unknown) => void;
	succeed: (message: string, ...rest: unknown[]) => void;
}

const INPUT = '{"name":"Example"}';
const BODY = { name: 'Example' };

interface WiringCase {
	title: string;
	commandClass: CommandClass;
	args?: Record<string, string>;
	flags?: Record<string, unknown>;
	/** The one client method the command may call. */
	method: string;
	callArgs: unknown[];
}

const CASES: WiringCase[] = [
	{
		title: 'promotion-provider get',
		commandClass: PromotionProviderGet,
		args: { id: 'prov-1' },
		method: 'getPromotionProvider',
		callArgs: ['prov-1'],
	},
	{
		title: 'promotion-provider list',
		commandClass: PromotionProviderList,
		flags: { limit: 5 },
		method: 'listPromotionProviders',
		callArgs: [5],
	},
	{
		title: 'promotion-provider update',
		commandClass: PromotionProviderUpdate,
		args: { id: 'prov-1' },
		method: 'updatePromotionProvider',
		callArgs: ['prov-1', BODY],
	},
	{
		title: 'promotion-provider delete',
		commandClass: PromotionProviderDelete,
		args: { id: 'prov-1' },
		method: 'deletePromotionProvider',
		callArgs: ['prov-1'],
	},
	{
		title: 'promotion-environment get',
		commandClass: PromotionEnvironmentGet,
		args: { id: 'conn-1' },
		method: 'getPromotionConnection',
		callArgs: ['conn-1'],
	},
	{
		title: 'promotion-environment create',
		commandClass: PromotionEnvironmentCreate,
		method: 'createPromotionConnection',
		callArgs: [BODY],
	},
	{
		title: 'promotion-environment update',
		commandClass: PromotionEnvironmentUpdate,
		args: { id: 'conn-1' },
		method: 'updatePromotionConnection',
		callArgs: ['conn-1', BODY],
	},
	{
		title: 'promotion-environment delete',
		commandClass: PromotionEnvironmentDelete,
		args: { id: 'conn-1' },
		method: 'deletePromotionConnection',
		callArgs: ['conn-1'],
	},
	{
		title: 'promotion-environment set-config',
		commandClass: PromotionEnvironmentSetConfig,
		args: { id: 'conn-1', direction: 'promote' },
		method: 'setPromotionConfig',
		callArgs: ['conn-1', 'promote', BODY],
	},
	{
		title: 'promotion-environment delete-config',
		commandClass: PromotionEnvironmentDeleteConfig,
		args: { id: 'conn-1', direction: 'apply' },
		method: 'deletePromotionConfig',
		callArgs: ['conn-1', 'apply'],
	},
	{
		title: 'promotion-environment clone',
		commandClass: PromotionEnvironmentClone,
		args: { id: 'conn-1', direction: 'promote' },
		method: 'clonePromotionCheckout',
		callArgs: ['conn-1', 'promote'],
	},
	{
		title: 'promotion-environment disconnect',
		commandClass: PromotionEnvironmentDisconnect,
		args: { id: 'conn-1', direction: 'apply' },
		method: 'disconnectPromotionCheckout',
		callArgs: ['conn-1', 'apply'],
	},
	{
		title: 'promotion-environment list-projects',
		commandClass: PromotionEnvironmentListProjects,
		args: { id: 'conn-1' },
		method: 'listPromotionConnectionProjects',
		callArgs: ['conn-1'],
	},
	{
		title: 'promotion-environment list-changes',
		commandClass: PromotionEnvironmentListChanges,
		args: { projectId: 'proj-1', direction: 'promote' },
		method: 'listProjectPromotionChanges',
		callArgs: ['proj-1', 'promote', {}],
	},
	{
		title: 'promotion-environment add-project',
		commandClass: PromotionEnvironmentAddProject,
		args: { id: 'conn-1', projectId: 'proj-1' },
		method: 'addProjectToPromotionConnection',
		callArgs: ['conn-1', 'proj-1'],
	},
	{
		title: 'promotion-environment remove-project',
		commandClass: PromotionEnvironmentRemoveProject,
		args: { id: 'conn-1', projectId: 'proj-1' },
		method: 'removeProjectFromPromotionConnection',
		callArgs: ['conn-1', 'proj-1'],
	},
];

/**
 * These commands hand their arguments to one client method and print the answer.
 * The methods share their shapes, so a command wired to a neighbour's method
 * still compiles. Giving the stub only the expected method turns that into a
 * failure: any other call finds nothing to call.
 */
describe('promotion commands call the client method that belongs to them', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each(CASES)('$title', async ({ commandClass, args, flags, method, callArgs }) => {
		const command = instantiate(commandClass);
		const internals = command as unknown as Internals;
		const call = vi.fn().mockResolvedValue({ id: 'result' });

		vi.spyOn(internals, 'parse').mockResolvedValue({ args: args ?? {}, flags: flags ?? {} });
		vi.spyOn(internals, 'readInput').mockReturnValue(INPUT);
		vi.spyOn(internals, 'getClient').mockReturnValue({ [method]: call } as unknown as N8nClient);
		vi.spyOn(internals, 'output').mockImplementation(() => {});
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});

		await command.run();

		expect(call).toHaveBeenCalledWith(...callArgs);
	});
});
