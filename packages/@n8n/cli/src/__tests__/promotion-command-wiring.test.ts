import type { Config } from '@oclif/core';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PromotionConnectionAddProject from '../commands/promotion-connection/add-project';
import PromotionConnectionClone from '../commands/promotion-connection/clone';
import PromotionConnectionCreate from '../commands/promotion-connection/create';
import PromotionConnectionDelete from '../commands/promotion-connection/delete';
import PromotionConnectionDeleteConfig from '../commands/promotion-connection/delete-config';
import PromotionConnectionDisconnect from '../commands/promotion-connection/disconnect';
import PromotionConnectionGet from '../commands/promotion-connection/get';
import PromotionConnectionListProjects from '../commands/promotion-connection/list-projects';
import PromotionConnectionRemoveProject from '../commands/promotion-connection/remove-project';
import PromotionConnectionSetConfig from '../commands/promotion-connection/set-config';
import PromotionConnectionUpdate from '../commands/promotion-connection/update';
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
		title: 'promotion-connection get',
		commandClass: PromotionConnectionGet,
		args: { id: 'conn-1' },
		method: 'getPromotionConnection',
		callArgs: ['conn-1'],
	},
	{
		title: 'promotion-connection create',
		commandClass: PromotionConnectionCreate,
		method: 'createPromotionConnection',
		callArgs: [BODY],
	},
	{
		title: 'promotion-connection update',
		commandClass: PromotionConnectionUpdate,
		args: { id: 'conn-1' },
		method: 'updatePromotionConnection',
		callArgs: ['conn-1', BODY],
	},
	{
		title: 'promotion-connection delete',
		commandClass: PromotionConnectionDelete,
		args: { id: 'conn-1' },
		method: 'deletePromotionConnection',
		callArgs: ['conn-1'],
	},
	{
		title: 'promotion-connection set-config',
		commandClass: PromotionConnectionSetConfig,
		args: { id: 'conn-1', direction: 'promote' },
		method: 'setPromotionConfig',
		callArgs: ['conn-1', 'promote', BODY],
	},
	{
		title: 'promotion-connection delete-config',
		commandClass: PromotionConnectionDeleteConfig,
		args: { id: 'conn-1', direction: 'apply' },
		method: 'deletePromotionConfig',
		callArgs: ['conn-1', 'apply'],
	},
	{
		title: 'promotion-connection clone',
		commandClass: PromotionConnectionClone,
		args: { id: 'conn-1', direction: 'promote' },
		method: 'clonePromotionCheckout',
		callArgs: ['conn-1', 'promote'],
	},
	{
		title: 'promotion-connection disconnect',
		commandClass: PromotionConnectionDisconnect,
		args: { id: 'conn-1', direction: 'apply' },
		method: 'disconnectPromotionCheckout',
		callArgs: ['conn-1', 'apply'],
	},
	{
		title: 'promotion-connection list-projects',
		commandClass: PromotionConnectionListProjects,
		args: { id: 'conn-1' },
		method: 'listPromotionConnectionProjects',
		callArgs: ['conn-1'],
	},
	{
		title: 'promotion-connection add-project',
		commandClass: PromotionConnectionAddProject,
		args: { id: 'conn-1', projectId: 'proj-1' },
		method: 'addProjectToPromotionConnection',
		callArgs: ['conn-1', 'proj-1'],
	},
	{
		title: 'promotion-connection remove-project',
		commandClass: PromotionConnectionRemoveProject,
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
