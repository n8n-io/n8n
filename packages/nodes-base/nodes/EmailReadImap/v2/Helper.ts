import { LoggerProxy as Logger } from 'n8n-workflow';

export function nodeLog(message: string, meta?: object) {
	Logger.info(`[ n8n-nodes-base.emailReadImap ] - ${message}`, meta);
}
