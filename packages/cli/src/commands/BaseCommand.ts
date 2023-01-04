import { Command } from '@oclif/core';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger, Logger } from '@/Logger';
import { User } from '@db/entities/User';
import * as Db from '@/Db';
import { inTest } from '@/constants';
import { UserSettings } from 'n8n-core';
import { CredentialTypes } from '@/CredentialTypes';
import { NodeTypes } from '@/NodeTypes';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { InternalHooksManager } from '@/InternalHooksManager';

export abstract class BaseCommand extends Command {
	logger: Logger;

	/**
	 * Lifecycle methods
	 */

	async init(): Promise<void> {
		this.initLogger();

		await Db.init();
	}

	initLogger() {
		this.logger = getLogger();
		LoggerProxy.init(this.logger);
	}

	async initInternalHooksManager(): Promise<void> {
		const loadNodesAndCredentials = LoadNodesAndCredentials();
		await loadNodesAndCredentials.init();

		const nodeTypes = NodeTypes(loadNodesAndCredentials);
		CredentialTypes(loadNodesAndCredentials);

		const instanceId = await UserSettings.getInstanceId();
		await InternalHooksManager.init(instanceId, nodeTypes);
	}

	async finally(): Promise<void> {
		if (inTest) return;

		this.exit();
	}

	/**
	 * User Management utils
	 */

	defaultUserProps = {
		firstName: null,
		lastName: null,
		email: null,
		password: null,
		resetPasswordToken: null,
	};

	async getInstanceOwner(): Promise<User> {
		const globalRole = await Db.collections.Role.findOneOrFail({
			name: 'owner',
			scope: 'global',
		});

		const owner = await Db.collections.User.findOne({ globalRole });

		if (owner) return owner;

		const user = new User();

		Object.assign(user, { ...this.defaultUserProps, globalRole });

		await Db.collections.User.save(user);

		return Db.collections.User.findOneOrFail({ globalRole });
	}
}
