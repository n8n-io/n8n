import type {
	COMMAND_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from '@/services/redis/redis-constants';

/**
 * Pubsub channel used by scaling mode:
 *
 * - `n8n.commands` for messages sent by a main process to command workers or other main processes
 * - `n8n.worker-response` for messages sent by workers in response to commands from main processes
 */
export type ScalingPubSubChannel =
	| typeof COMMAND_REDIS_CHANNEL
	| typeof WORKER_RESPONSE_REDIS_CHANNEL;
