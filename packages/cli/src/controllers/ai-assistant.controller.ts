import { Post, RestController } from '@/decorators';
import { AiAssistantService } from '@/services/ai-assistant.service';
import { AiAssistantRequest } from '@/requests';
import type { Response } from 'express';
import type { AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import { Readable, promises, Writable } from 'node:stream';
import { InternalServerError } from 'express-openapi-validator/dist/openapi.validator';
import { strict as assert } from 'node:assert';
import { ErrorReporterProxy } from 'n8n-workflow';

type FlushableResponse = Response & { flush: () => void };

class OutputStream extends Writable {
	constructor(private readonly res: FlushableResponse) {
		super();
		this.once('finish', () => this.res.end());
		res.header('Content-type', 'application/json-lines').flush();
	}

	// eslint-disable-next-line id-denylist
	override _write(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null) => void) {
		this.res.write(chunk, encoding);
		this.res.flush();
		cb();
	}
}

@RestController('/ai-assistant')
export class AiAssistantController {
	constructor(private readonly aiAssistantService: AiAssistantService) {}

	@Post('/chat', { rateLimit: { limit: 100 } })
	async chat(req: AiAssistantRequest.Chat, res: FlushableResponse) {
		try {
			const aiResponse = await this.aiAssistantService.chat(req.body, req.user);
			if (aiResponse.body) {
				await promises.pipeline(Readable.fromWeb(aiResponse.body), new OutputStream(res));
			}
		} catch (e) {
			assert(e instanceof Error);
			ErrorReporterProxy.error(e);
			throw new InternalServerError({ message: `Something went wrong: ${e.message}` });
		}
	}

	@Post('/chat/apply-suggestion')
	async applySuggestion(
		req: AiAssistantRequest.ApplySuggestion,
	): Promise<AiAssistantSDK.ApplySuggestionResponse> {
		try {
			return await this.aiAssistantService.applySuggestion(req.body, req.user);
		} catch (e) {
			assert(e instanceof Error);
			ErrorReporterProxy.error(e);
			throw new InternalServerError({ message: `Something went wrong: ${e.message}` });
		}
	}
}
