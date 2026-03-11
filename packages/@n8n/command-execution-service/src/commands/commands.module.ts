import { Module } from '@nestjs/common';

import { VolumesModule } from '../volumes/volumes.module';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';

@Module({
	imports: [VolumesModule],
	controllers: [CommandsController],
	providers: [CommandsService],
})
export class CommandsModule {}
