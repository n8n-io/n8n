import { Container } from 'typedi';
import { jsonParse } from 'n8n-workflow';
import { Logger } from '@/Logger';
import type { RedisServiceCommandObject } from '../redis/RedisServiceCommands';
import { COMMAND_REDIS_CHANNEL } from '../redis/RedisServiceHelper';
import * as os from 'os';

export interface RedisServiceCommandLastReceived {
	[date: string]: Date;
}

export function messageToRedisServiceCommandObject(messageString: string) {
	if (!messageString) return;
	let message: RedisServiceCommandObject;
	try {
		message = jsonParse<RedisServiceCommandObject>(messageString);
	} catch {
		Container.get(Logger).debug(
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

export function getOsCpuString(): string {
	const cpus = os.cpus();
	if (cpus.length === 0) return 'no CPU info';
	return `${cpus.length}x ${cpus[0].model} - speed: ${cpus[0].speed}`;
}
