import { limitAiResponseStream } from '@n8n/ai-utilities/http-proxy-agent';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Readable } from 'node:stream';

/** Preserve the SDK handler's keepalive and timeout settings while limiting its response. */
export class ResponseLimitedNodeHttpHandler extends NodeHttpHandler {
	override async handle(
		...args: Parameters<NodeHttpHandler['handle']>
	): ReturnType<NodeHttpHandler['handle']> {
		const result = await super.handle(...args);
		const body: unknown = result.response.body;
		if (body instanceof Readable) {
			result.response.body = limitAiResponseStream(body);
		}
		return result;
	}
}
