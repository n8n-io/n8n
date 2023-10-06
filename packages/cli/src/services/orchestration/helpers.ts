import { LoggerProxy, jsonParse } from 'n8n-workflow';
import type { RedisServiceCommandObject } from '../redis/RedisServiceCommands';
import { COMMAND_REDIS_CHANNEL } from '../redis/RedisServiceHelper';

export interface RedisServiceCommandLastReceived {
	[date: string]: Date;
}

export function messageToRedisServiceCommandObject(messageString: string) {
	if (!messageString) return;
	let message: RedisServiceCommandObject;
	try {
		message = jsonParse<RedisServiceCommandObject>(messageString);
	} catch {
		LoggerProxy.debug(
			`Received invalid message via channel ${COMMAND_REDIS_CHANNEL}: "${messageString}"`,
		);
		return;
	}
	return message;
}

const lastReceived: RedisServiceCommandLastReceived = {};

export function debounceMessageReceiver(message: RedisServiceCommandObject, timeout: number = 100) {
	const now = new Date();
	const lastReceivedDate = lastReceived[message.command];
	if (lastReceivedDate && now.getTime() - lastReceivedDate.getTime() < timeout) {
		return false;
	}
	lastReceived[message.command] = now;
	return true;
}
