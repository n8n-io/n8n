import { expose, isWorkerRuntime, registerSerializer } from 'threads/worker';
import { EventMessage, messageEventSerializer } from '../EventMessageClasses/EventMessage';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

const consoleEventSubscriberWorker = {
	receive(msg: EventMessage) {
		process.stdout.write(
			`consoleEventSubscriber: Received Event ${msg.eventName} || Payload: ${JSON.stringify(
				msg.payload,
			)}\n`,
		);
	},
	communicate(msg: string, param: unknown) {},
};

if (isWorkerRuntime()) {
	// Register the serializer on the worker thread
	registerSerializer(messageEventSerializer);
	expose(consoleEventSubscriberWorker);
}
