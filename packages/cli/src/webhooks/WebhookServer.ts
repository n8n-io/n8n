import { Service } from 'typedi';
import { AbstractServer } from '@/AbstractServer';

@Service()
export class WebhookServer extends AbstractServer {
	constructor() {
		super('webhook');
	}
}
