export const QUEUE_NAME = 'jobs';

export const JOB_TYPE_NAME = 'job';

/** Pubsub channel for commands sent by a main process to workers or to other main processes. */
export const COMMAND_PUBSUB_CHANNEL = 'n8n.commands';

/** Pubsub channel for messages sent by workers in response to commands from main processes. */
export const WORKER_RESPONSE_PUBSUB_CHANNEL = 'n8n.worker-response';
