import { LoggerProxy as Logger } from 'n8n-workflow';
import { InternalHooksManager } from '@/InternalHooksManager';
import config from '@/config';
import * as Db from '@/Db';
import { registerController } from '@/decorators/registerController';
import { OwnerController } from '@/controllers/OwnerController';
import { AuthController } from '@/controllers/AuthController';
import { MeController } from '@/controllers/MeController';
import { PasswordResetController } from '@/controllers/PasswordResetController';
import { UsersController } from '@/controllers/UsersController';
import { setupAuthMiddlewares } from '@/UserManagement/middlewares';
import * as UserManagementMailer from '@/UserManagement/email/UserManagementMailer';
import type { N8nApp } from '@/UserManagement/Interfaces';

export function addRoutes(
	this: N8nApp,
	ignoredEndpoints: Readonly<string[]>,
	restEndpoint: string,
): void {
	const userRepository = Db.collections.User;
	setupAuthMiddlewares(this.app, ignoredEndpoints, restEndpoint, userRepository);

	const externalHooks = this.externalHooks;
	const internalHooks = InternalHooksManager.getInstance();
	const mailer = UserManagementMailer.getInstance();
	const controllers = [
		new AuthController(config, internalHooks, userRepository, Logger),
		new OwnerController(config, internalHooks, Db.collections.Settings, userRepository, Logger),
		new MeController(externalHooks, internalHooks, userRepository, Logger),
		new PasswordResetController(config, externalHooks, internalHooks, userRepository, Logger),
		new UsersController(
			config,
			mailer,
			externalHooks,
			internalHooks,
			userRepository,
			Db.collections.Role,
			Db.collections.SharedCredentials,
			Db.collections.SharedWorkflow,
			this.activeWorkflowRunner,
			Logger,
		),
	];
	controllers.forEach((controller) => registerController(this.app, config, controller));
}
