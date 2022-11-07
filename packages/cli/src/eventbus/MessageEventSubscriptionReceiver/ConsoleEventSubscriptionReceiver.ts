import { parse } from 'node:path';
import { MessageEventSubscriptionReceiver } from './MessageEventSubscriptionReceiver';

// ---------------------------------------
// * This part runs in the Main Thread ! *
// ---------------------------------------

export class ConsoleEventSubscriptionReceiver extends MessageEventSubscriptionReceiver {
	constructor(props?: { name?: string }) {
		super({
			name: props?.name ?? 'ConsoleEventSubscriptionReceiver',
			workerFile: `../MessageEventSubscriptionReceiver/${parse(__filename).name}Worker`,
		});
	}
}
