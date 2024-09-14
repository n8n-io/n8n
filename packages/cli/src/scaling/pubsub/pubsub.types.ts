/**
 * Pub/sub channel used by scaling mode:
 *
 * - `n8n.commands` for commands sent by a main process to workers or to other main processes
 * - `n8n.worker-response` for responses sent by workers to the main processes
 */
export type PubSubChannel = 'n8n.commands' | 'n8n.worker-response';

/** Function called by the subscriber to handle every message received via a pub/sub channel. */
export type HandlerFn = (channel: string, msg: string) => void;
