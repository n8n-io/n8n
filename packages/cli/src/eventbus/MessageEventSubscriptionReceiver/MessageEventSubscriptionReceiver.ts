import { spawn, Worker, Thread, ModuleThread } from 'threads';
import { EventMessage } from '../EventMessage/EventMessage';
import { MessageEventSubscriptionReceiverInterface } from './MessageEventSubscriptionReceiverInterface';

export type EventSubscriberWorker = {
	receive(msg: unknown): void;
	communicate(msg: string, param: unknown): void;
};

// const isModuleThreadEventSubscriberWorker = (
// 	candidate: unknown,
// ): candidate is ModuleThread<EventSubscriberWorker> => {
// 	const o = candidate as ModuleThread<EventSubscriberWorker>;
// 	return o.communicate !== undefined && o.receive !== undefined;
// };

export class MessageEventSubscriptionReceiver implements MessageEventSubscriptionReceiverInterface {
	name: string;

	workerFile: string;

	worker: ModuleThread<EventSubscriberWorker> | undefined;

	constructor(props: { name: string; workerFile: string }) {
		this.name = props.name;
		this.workerFile = props.workerFile;
	}

	async launchThread(): Promise<ModuleThread<EventSubscriberWorker>> {
		this.worker = await spawn<EventSubscriberWorker>(new Worker(this.workerFile));
		Thread.events(this.worker).subscribe((event) => console.debug('Thread event:', event));
		return this.worker;
	}

	async terminateThread() {
		if (this.worker) {
			await Thread.terminate(this.worker);
		}
	}

	async receive(msg: EventMessage) {
		await this.worker?.receive(msg);
		// console.debug('MessageEventSubscriptionReceiver received:', msg);
	}
}
