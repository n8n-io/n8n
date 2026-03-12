import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import serverConfig from './config/server.config';
import { SandboxService } from './sandbox/sandbox.service';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);

	const config = app.get<ConfigType<typeof serverConfig>>(serverConfig.KEY);

	// Check that bwrap is available
	const sandboxService = app.get(SandboxService);
	const { errors } = sandboxService.checkDependencies();
	if (errors.length > 0) {
		logger.warn(`Sandbox dependencies not satisfied: ${errors.join(', ')}`);
		logger.warn('Commands will fail if bwrap is not available.');
	}

	app.enableShutdownHooks();

	await app.listen(config.port, config.host);
	logger.log(`Command Execution Service listening on ${config.host}:${config.port}`);
}

void bootstrap().catch((error) => {
	logger.error('Failed to start Command Execution Service:', error);
	process.exit(1);
});
