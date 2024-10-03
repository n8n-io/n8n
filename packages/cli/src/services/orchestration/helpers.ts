import { jsonParse } from 'n8n-workflow';
import os from 'node:os';
import { Container } from 'typedi';

import { Logger } from '@/logging/logger.service';
import { COMMAND_PUBSUB_CHANNEL } from '@/scaling/constants';
import type { PubSub } from '@/scaling/pubsub/pubsub.types';

export interface RedisServiceCommandLastReceived {
	[date: string]: Date;
}

export function messageToRedisServiceCommandObject(messageString: string) {
	if (!messageString) return;
	let message: PubSub.Command;
	try {
		message = jsonParse<PubSub.Command>(messageString);
	} catch {
		Container.get(Logger).debug(
			`Received invalid message via channel ${COMMAND_PUBSUB_CHANNEL}: "${messageString}"`,
		);
		return;
	}
	return message;
}

const lastReceived: RedisServiceCommandLastReceived = {};

export function debounceMessageReceiver(message: PubSub.Command, timeout: number = 100) {
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
