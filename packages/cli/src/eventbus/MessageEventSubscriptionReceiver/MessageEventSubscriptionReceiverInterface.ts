import { ModuleThread } from 'threads';
import { EventSubscriberWorker } from './MessageEventSubscriptionReceiver';
import { Worker } from 'node:worker_threads';
import { EventMessage } from '../EventMessage/EventMessage';

export interface MessageEventSubscriptionReceiverInterface {
	name: string;

	workerFile: string;

	worker: ModuleThread<EventSubscriberWorker> | Worker | undefined;

	launchThread(): Promise<ModuleThread<EventSubscriberWorker>> | Promise<Worker>;

	terminateThread(): Promise<void>;

	receive(msg: EventMessage): Promise<void>;
}
