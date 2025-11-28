import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { SourceControlService } from './source-control.service.ee';

/**
 * TODO: Change the controller path to '/source-control' once `packages/cli/src/environments.ee/source-control/source-control.controller.ee.ts` is removed.
 */
@RestController('/source-control-ee')
export class SourceControlController {
	constructor(private readonly myFeatureService: SourceControlService) {}

	@Get('/hello')
	async hello(_req: AuthenticatedRequest, _res: Response) {
		return await this.myFeatureService.sayHello();
	}
}
