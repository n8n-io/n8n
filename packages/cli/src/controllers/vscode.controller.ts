import { Post, RestController } from '@n8n/decorators';

import { Push } from '@/push';

@RestController('/vscode')
export class VscodeController {
	constructor(private readonly push: Push) {}

	@Post('/start', { skipAuth: true })
	start(req: Request) {
		console.log('start', req.body);
		this.push.broadcast({
			// @ts-expect-error abc
			type: 'vscode:start',
			data: {
				// @ts-expect-error abc
				port: req.body.port,
			},
		});
	}
}
