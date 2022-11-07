/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { isMainThread, parentPort } from 'node:worker_threads';
import { appendFileSync } from 'node:fs';
// import { isEventMessageDeserialized } from '../classes/EventMessage';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

if (!isMainThread) {
	let LOG_FILE_NAME = '';
	let PAUSED = true;

	setInterval(() => {
		process.stdout.write(`NodeWorker: ${JSON.stringify(process.memoryUsage())}\n`);
	}, 5000);

	parentPort?.on('message', (msg) => {
		process.stdout.write(`NODE RECEIVED: ${JSON.stringify(msg)}\n`);
		try {
			if (msg.cmd !== undefined) {
				switch (msg.cmd) {
					case 'setFileName': {
						if (msg.param !== undefined && typeof msg.param === 'string') {
							LOG_FILE_NAME = msg.param;
						}
					}
					case 'pause': {
						PAUSED = true;
					}
					case 'start': {
						PAUSED = false;
					}
					case 'eventMessage': {
						if (PAUSED) {
							return;
						}
						if (msg.param !== undefined && LOG_FILE_NAME) {
							appendFileSync(LOG_FILE_NAME, JSON.stringify(msg.param) + '\n');
						}
					}
				}
			}
		} catch (error) {
			console.log(error);
		}
	});
}
