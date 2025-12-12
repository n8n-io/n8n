import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type {
	INode,
	INodeLogger,
	IWorkflowExecuteAdditionalData,
	LogLevel,
	NodeLogMetadata,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export class NodeLogger implements INodeLogger {
	private readonly logger: Logger;
	constructor(
		private readonly node: INode,
		private readonly additionalData: IWorkflowExecuteAdditionalData,
		private readonly mode: WorkflowExecuteMode,
	) {
		this.logger = Container.get<Logger>(Logger);
	}

	private writeConsoleLog(level: LogLevel, message: string | object, metadata?: NodeLogMetadata) {
		const formattedMessage =
			typeof message === 'string' ? message : JSON.stringify(message, null, 2);
		switch (level) {
			case 'error':
				this.logger.error(formattedMessage, metadata);
				break;
			case 'warn':
				this.logger.warn(formattedMessage, metadata);
				break;
			case 'info':
				this.logger.info(formattedMessage, metadata);
				break;
			case 'debug':
				this.logger.debug(formattedMessage, metadata);
				break;
			default:
				throw new Error(`Invalid log level: ${level}`);
		}
	}

	private log(level: LogLevel, message: string | object, metadata?: NodeLogMetadata) {
		this.writeConsoleLog(level, message, metadata);
		const shouldSendToUI = this.mode === 'manual' && this.node.nodeDebugLogs;
		if (this.additionalData.sendDataToUI && shouldSendToUI) {
			const parts: string[] = [];
			parts.push(`Node: "${this.node.name}"`);
			parts.push(`Date: "${new Date().toISOString()}"`);
			if (metadata?.tag) {
				parts.push(`Tag: "${metadata.tag}"`);
			}
			const source = `[${parts.join(', ')}]`;

			this.additionalData.sendDataToUI('sendConsoleMessage', {
				source,
				messages: [message],
				level,
			});
		}
	}
	error(message: string | object, metadata?: NodeLogMetadata) {
		this.log('error', message, metadata);
	}
	warn(message: string | object, metadata?: NodeLogMetadata) {
		this.log('warn', message, metadata);
	}
	info(message: string | object, metadata?: NodeLogMetadata) {
		this.log('info', message, metadata);
	}
	debug(message: string | object, metadata?: NodeLogMetadata) {
		this.log('debug', message, metadata);
	}
}
