import { Command } from '@oclif/core';
import { LoggerProxy } from 'n8n-workflow';
import { getLogger, Logger } from '@/Logger';
import { User } from '@db/entities/User';
import * as Db from '@/Db';

export abstract class BaseCommand extends Command {
	logger: Logger;

	/**
	 * Lifecycle methods
	 */

	async init(): Promise<void> {
		this.logger = getLogger();
		LoggerProxy.init(this.logger);

		await Db.init();
	}

	async finally(): Promise<void> {
		if (process.env.NODE_ENV === 'test') return;

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
		const ownerGlobalRole = await Db.repositories.Role.findOneOrFail('owner', 'global');
		const owner = await Db.repositories.User.findOneByGlobalRole(ownerGlobalRole);
		if (owner) return owner;
		return Db.repositories.User.create({ globalRole: ownerGlobalRole });
	}
}
