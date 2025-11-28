import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { MyFeatureService } from './environments.service.ee';

@RestController('/environments')
export class MyFeatureController {
	constructor(private readonly myFeatureService: MyFeatureService) {}

	@Get('/hello')
	async hello(_req: AuthenticatedRequest, _res: Response) {
		return await this.myFeatureService.sayHello();
	}
}
