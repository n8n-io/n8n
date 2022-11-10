import { expose, isWorkerRuntime, registerSerializer } from 'threads/worker';
import { EventMessage, messageEventSerializer } from '../EventMessageClasses/EventMessage';
// eslint-disable-next-line import/no-extraneous-dependencies
import Redis, { RedisOptions } from 'ioredis';

// -----------------------------------------
// * This part runs in the Worker Thread ! *
// -----------------------------------------

if (isWorkerRuntime()) {
	let PAUSED = true;
	let client: Redis | undefined;

	const redisEventSubscriberWorker = {
		receive(msg: EventMessage) {
			process.stdout.write(
				`consoleEventSubscriber: Received Event ${msg.eventName} || Payload: ${JSON.stringify(
					msg.payload,
				)}\n`,
			);
		},
		communicate(msg: string, param: unknown) {
			switch (msg) {
				case 'connect': {
					const redisOptions = {
						port: 6379, // Redis port
						host: '127.0.0.1', // Redis host
						db: 0, // Defaults to 0
					};
					client = new Redis(redisOptions);
					client
						?.monitor((error, monitor) => {
							monitor?.on('monitor', (time, args, source, database) => {
								console.log('RECEIVER', time, args, source, database);
							});
						})
						.catch((error) => console.log(error));
				}
				case 'subscribe': {
					let channelName = 'n8n-events';
					if (typeof param === 'string') {
						channelName = param;
					}

					if (client?.status === 'ready') {
						client
							.subscribe(channelName, (error, count) => {
								if (error) {
									// Just like other commands, subscribe() can fail for some reasons,
									// ex network issues.
									console.error('Failed to subscribe: %s', error.message);
								} else {
									// `count` represents the number of channels this client are currently subscribed to.
									console.log(
										`Subscribed successfully! This client is currently subscribed to ${
											count as number
										} channels.`,
									);
								}
							})
							.catch((error) => console.log(error));
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

	// Register the serializer on the worker thread
	registerSerializer(messageEventSerializer);
	expose(redisEventSubscriberWorker);
}
