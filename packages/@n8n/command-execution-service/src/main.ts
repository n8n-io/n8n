import 'reflect-metadata';

import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import serverConfig from './config/server.config';
import { SandboxService } from './sandbox/sandbox.service';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);

	const config = app.get<ConfigType<typeof serverConfig>>(serverConfig.KEY);

	// Check that bwrap is available
	const sandboxService = app.get(SandboxService);
	const { errors } = sandboxService.checkDependencies();
	if (errors.length > 0) {
		console.warn('Sandbox dependencies not satisfied:', errors.join(', '));
		console.warn('Commands will fail if bwrap is not available.');
	}

	app.enableShutdownHooks();

	await app.listen(config.port, config.host);
	console.log(`Command Execution Service listening on ${config.host}:${config.port}`);
}

void bootstrap().catch((error) => {
	console.error('Failed to start Command Execution Service:', error);
	process.exit(1);
});
