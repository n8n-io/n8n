import type { AbstractServerOpts } from '@/AbstractServer';
import { AbstractServer } from '@/AbstractServer';

export class WebhookServer extends AbstractServer {
	constructor(opts: Omit<AbstractServerOpts, 'instanceType'>) {
		super({
			...opts,
			instanceType: 'webhook',
		});
	}
}
