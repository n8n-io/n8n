import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommandsModule } from './commands/commands.module';
import s3Config from './config/s3.config';
import sandboxConfig from './config/sandbox.config';
import serverConfig from './config/server.config';
import { HealthModule } from './health/health.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { StorageModule } from './storage/s3-storage.module';
import { VolumesModule } from './volumes/volumes.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [s3Config, sandboxConfig, serverConfig],
			isGlobal: true,
		}),
		StorageModule,
		SandboxModule,
		HealthModule,
		VolumesModule,
		CommandsModule,
	],
})
export class AppModule {}
