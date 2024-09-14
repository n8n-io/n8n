/**
 * Pubsub channel used by scaling mode:
 *
 * - `n8n.commands` for messages sent by a main process to command workers or other main processes
 * - `n8n.worker-response` for messages sent by workers in response to commands from main processes
 */
export type PubSubChannel = 'n8n.commands' | 'n8n.worker-response';
