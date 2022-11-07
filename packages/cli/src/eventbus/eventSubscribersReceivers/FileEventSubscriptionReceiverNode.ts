// import { UserSettings } from 'n8n-core';
// import { join, parse } from 'node:path';
// import { appendFileSync } from 'node:fs';
// import { Worker, isMainThread, parentPort } from 'node:worker_threads';
// import { MessageEventSubscriptionReceiverNode } from './MessageEventSubscriptionReceiverNode';

// // -----------------------------------------
// // * This part runs in the Worker Thread ! *
// // -----------------------------------------

// // let LOG_FILE_NAME = '';
// // let PAUSED = true;

// // if (!isMainThread) {
// // 	setInterval(() => {
// // 		process.stdout.write(`NodeWorker: ${JSON.stringify(process.memoryUsage())}\n`);
// // 	}, 5000);

// // 	parentPort?.on('message', (msg) => {
// // 		process.stdout.write(`NODE RECEIVED: ${JSON.stringify(msg)}\n`);
// // 	});
// // }

// // const fileEventSubscriberWorker = {
// // 	receive(msg: unknown) {
// // 		if (PAUSED) {
// // 			return;
// // 		}

// // 		if (isEventMessageDeserialized(msg)) {
// // 			appendFileSync(LOG_FILE_NAME, JSON.stringify(msg) + '\n');
// // 		}
// // 	},
// // 	communicate(msg: string, param: unknown) {
// // 		switch (msg) {
// // 			case 'setFileName': {
// // 				if (typeof param === 'string') {
// // 					LOG_FILE_NAME = param;
// // 				}
// // 			}
// // 			case 'pause': {
// // 				PAUSED = true;
// // 			}
// // 			case 'start': {
// // 				PAUSED = false;
// // 			}
// // 		}
// // 	},
// // };

// // ---------------------------------------
// // * This part runs in the Main Thread ! *
// // ---------------------------------------

// export class FileEventSubscriptionReceiverNode extends MessageEventSubscriptionReceiverNode {
// 	logFileName;

// 	constructor(props?: { name?: string; fileName?: string }) {
// 		super({
// 			name: props?.name ?? 'FileEventSubscriptionReceiver',
// 			workerFile: `../src/eventBus/eventSubscribersReceivers/${parse(__filename).name}Worker.mjs`,
// 		});

// 		if (props?.fileName) {
// 			if (!parse(props.fileName).dir) {
// 				this.logFileName = join(UserSettings.getUserN8nFolderPath(), props.fileName);
// 			} else {
// 				this.logFileName = props.fileName;
// 			}
// 		} else {
// 			this.logFileName = join(UserSettings.getUserN8nFolderPath(), 'event_log.txt');
// 		}
// 	}

// 	override async launchThread(): Promise<Worker> {
// 		this.worker = new Worker(this.workerFile);
// 		this.worker?.postMessage({ cmd: 'setFileName', param: this.logFileName });
// 		this.worker?.postMessage({ cmd: 'start', param: undefined });
// 		this.worker?.on('error', (error) => {
// 			console.log(error);
// 		});
// 		this.worker?.on('message', (msg) => {
// 			console.log(msg);
// 		});
// 		return this.worker;
// 	}
// }
