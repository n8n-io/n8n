// import { EventMessage, EventMessageSerialized } from '../EventMessage/EventMessage';
// import { Worker, isMainThread, parentPort } from 'node:worker_threads';
// import { MessageEventSubscriptionReceiverInterface } from './MessageEventSubscriptionReceiverInterface';

// export class MessageEventSubscriptionReceiverNode
// 	implements MessageEventSubscriptionReceiverInterface
// {
// 	name: string;

// 	workerFile: string;

// 	worker: Worker | undefined;

// 	constructor(props: { name: string; workerFile: string }) {
// 		this.name = props.name;
// 		this.workerFile = props.workerFile;
// 	}

// 	async launchThread(): Promise<Worker> {
// 		this.worker = new Worker(this.workerFile);
// 		this.worker.on('error', (error) => {
// 			console.log(error);
// 		});
// 		this.worker.on('message', (msg) => {
// 			console.log(msg);
// 		});
// 		return this.worker;
// 	}

// 	async terminateThread() {
// 		await this.worker?.terminate();
// 	}

// 	async receive(msg: unknown) {
// 		console.debug('MessageEventSubscriptionReceiver received:', msg);
// 		this.worker?.postMessage({ cmd: 'eventMessage', param: JSON.stringify(msg) });
// 	}
// }
