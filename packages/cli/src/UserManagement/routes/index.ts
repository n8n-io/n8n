import { LoggerProxy as logger } from 'n8n-workflow';
import { InternalHooksManager } from '@/InternalHooksManager';
import config from '@/config';
import * as Db from '@/Db';
import { registerController } from '@/decorators';
import {
	AuthController,
	MeController,
	OwnerController,
	PasswordResetController,
	UsersController,
} from '@/controllers';
import { setupAuthMiddlewares } from '@/UserManagement/middlewares';
import * as UserManagementMailer from '@/UserManagement/email/UserManagementMailer';
import type { N8nApp } from '@/UserManagement/Interfaces';

export function addRoutes(
	this: N8nApp,
	ignoredEndpoints: Readonly<string[]>,
	restEndpoint: string,
): void {
	const repositories = Db.collections;
	setupAuthMiddlewares(this.app, ignoredEndpoints, restEndpoint, repositories.User);

	const { externalHooks, activeWorkflowRunner } = this;
	const internalHooks = InternalHooksManager.getInstance();
	const mailer = UserManagementMailer.getInstance();

	const controllers = [
		new AuthController({ config, internalHooks, repositories, logger }),
		new OwnerController({ config, internalHooks, repositories, logger }),
		new MeController({ externalHooks, internalHooks, repositories, logger }),
		new PasswordResetController({ config, externalHooks, internalHooks, repositories, logger }),
		new UsersController({
			config,
			mailer,
			externalHooks,
			internalHooks,
			repositories,
			activeWorkflowRunner,
			logger,
		}),
	];
	controllers.forEach((controller) => registerController(this.app, config, controller));
}
