import { appendFileSync } from 'node:fs';
import { expose, isWorkerRuntime, registerSerializer } from 'threads/worker';
import { EventMessage, messageEventSerializer } from '../EventMessage/EventMessage';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

let LOG_FILE_NAME = '';
let PAUSED = true;

const fileEventSubscriberWorker = {
	receive(msg: EventMessage) {
		process.stdout.write(`${msg.getEventGroup() ?? 'keine gruppe?'}`);
		if (PAUSED) {
			return;
		}

		// if (isEventMessageDeserialized(msg)) {
		appendFileSync(LOG_FILE_NAME, JSON.stringify(msg) + '\n');
		// }
	},
	communicate(msg: string, param: unknown) {
		switch (msg) {
			case 'setFileName': {
				if (typeof param === 'string') {
					LOG_FILE_NAME = param;
				}
			}
			case 'pause': {
				PAUSED = true;
			}
			case 'start': {
				PAUSED = false;
			}
		}
	},
};

if (isWorkerRuntime()) {
	// Register the serializer on the worker thread
	registerSerializer(messageEventSerializer);
	expose(fileEventSubscriberWorker);
}
