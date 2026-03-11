import { Global, Module } from '@nestjs/common';

import { SandboxService } from './sandbox.service';

@Global()
@Module({
	providers: [SandboxService],
	exports: [SandboxService],
})
export class SandboxModule {}
