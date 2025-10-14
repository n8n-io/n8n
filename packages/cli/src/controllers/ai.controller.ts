import { FREE_AI_CREDITS_CREDENTIAL_NAME, STREAM_SEPARATOR } from '@/constants';
import type { CreateCredentialDto } from '@n8n/api-types';
import {
	AiChatRequestDto,
	AiApplySuggestionRequestDto,
	AiAskRequestDto,
	AiFreeCreditsRequestDto,
	AiBuilderChatRequestDto,
	AiSessionRetrievalRequestDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Post, RestController } from '@n8n/decorators';
import { type AiAssistantSDK, APIResponseError } from '@n8n_io/ai-assistant-sdk';
import { Response } from 'express';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import { WritableStream } from 'node:stream/web';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ContentTooLargeError } from '@/errors/response-errors/content-too-large.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { TooManyRequestsError } from '@/errors/response-errors/too-many-requests.error';
import { WorkflowBuilderService } from '@/services/ai-workflow-builder.service';
import { AiService } from '@/services/ai.service';
import { UserService } from '@/services/user.service';

export type FlushableResponse = Response & { flush: () => void };

@RestController('/ai')
export class AiController {
	constructor(
		private readonly aiService: AiService,
		private readonly workflowBuilderService: WorkflowBuilderService,
		private readonly credentialsService: CredentialsService,
		private readonly userService: UserService,
	) {}

	// Use usesTemplates flag to bypass the send() wrapper which would cause
	// "Cannot set headers after they are sent" error for streaming responses.
	// This ensures errors during streaming are handled within the stream itself.
	@Licensed('feat:aiBuilder')
	@Post('/build', { rateLimit: { limit: 100 }, usesTemplates: true })
	async build(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		@Body payload: AiBuilderChatRequestDto,
	) {
		try {
			const abortController = new AbortController();
			const { signal } = abortController;

			const handleClose = () => abortController.abort();

			res.on('close', handleClose);

			const { text, workflowContext, useDeprecatedCredentials } = payload.payload;
			const aiResponse = this.workflowBuilderService.chat(
				{
					message: text,
					workflowContext: {
						currentWorkflow: workflowContext.currentWorkflow,
						executionData: workflowContext.executionData,
						executionSchema: workflowContext.executionSchema,
					},
					useDeprecatedCredentials,
				},
				req.user,
				signal,
			);

			res.header('Content-type', 'application/json-lines').flush();

			try {
				// Handle the stream
				for await (const chunk of aiResponse) {
					res.flush();
					res.write(JSON.stringify(chunk) + STREAM_SEPARATOR);
				}
			} catch (streamError) {
				// If an error occurs during streaming, send it as part of the stream
				// This prevents "Cannot set headers after they are sent" error
				assert(streamError instanceof Error);

				// Send error as proper error type now that frontend supports it
				const errorChunk = {
					messages: [
						{
							role: 'assistant',
							type: 'error',
							content: streamError.message,
						},
					],
				};
				res.write(JSON.stringify(errorChunk) + STREAM_SEPARATOR);
			} finally {
				// Clean up event listener
				res.off('close', handleClose);
			}

			res.end();
		} catch (e) {
			// This catch block handles errors that occur before streaming starts
			// Since headers haven't been sent yet, we can still send a proper error response
			assert(e instanceof Error);
			if (!res.headersSent) {
				res.status(500).json({
					code: 500,
					message: e.message,
				});
			} else {
				// If headers were already sent dont't send a second error response
				res.end();
			}
		}
	}

	@Post('/chat', { rateLimit: { limit: 100 } })
	async chat(req: AuthenticatedRequest, res: FlushableResponse, @Body payload: AiChatRequestDto) {
		try {
			const aiResponse = await this.aiService.chat(payload, req.user);
			if (aiResponse.body) {
				res.header('Content-type', 'application/json-lines').flush();
				await aiResponse.body.pipeTo(
					new WritableStream({
						write(chunk) {
							res.write(chunk);
							res.flush();
						},
					}),
				);
				res.end();
			}
		} catch (e) {
			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}

	@Post('/chat/apply-suggestion')
	async applySuggestion(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: AiApplySuggestionRequestDto,
	): Promise<AiAssistantSDK.ApplySuggestionResponse> {
		try {
			return await this.aiService.applySuggestion(payload, req.user);
		} catch (e) {
			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}

	@Post('/ask-ai')
	async askAi(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: AiAskRequestDto,
	): Promise<AiAssistantSDK.AskAiResponsePayload> {
		try {
			return await this.aiService.askAi(payload, req.user);
		} catch (e) {
			if (e instanceof APIResponseError) {
				switch (e.statusCode) {
					case 413:
						throw new ContentTooLargeError(e.message);
					case 429:
						throw new TooManyRequestsError(e.message);
					case 400:
						throw new BadRequestError(e.message);
					default:
						throw new InternalServerError(e.message, e);
				}
			}

			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}

	@Post('/free-credits')
	async aiCredits(req: AuthenticatedRequest, _: Response, @Body payload: AiFreeCreditsRequestDto) {
		try {
			const aiCredits = await this.aiService.createFreeAiCredits(req.user);

			const credentialProperties: CreateCredentialDto = {
				name: FREE_AI_CREDITS_CREDENTIAL_NAME,
				type: OPEN_AI_API_CREDENTIAL_TYPE,
				data: {
					apiKey: aiCredits.apiKey,
					url: aiCredits.url,
				},
				projectId: payload?.projectId,
			};

			const newCredential = await this.credentialsService.createManagedCredential(
				credentialProperties,
				req.user,
			);

			await this.userService.updateSettings(req.user.id, {
				userClaimedAiCredits: true,
			});

			return newCredential;
		} catch (e) {
			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}

	@Licensed('feat:aiBuilder')
	@Post('/sessions', { rateLimit: { limit: 100 } })
	async getSessions(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: AiSessionRetrievalRequestDto,
	) {
		try {
			const sessions = await this.workflowBuilderService.getSessions(payload.workflowId, req.user);
			return sessions;
		} catch (e) {
			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}

	@Licensed('feat:aiBuilder')
	@Get('/build/credits')
	async getBuilderCredits(
		req: AuthenticatedRequest,
		_: Response,
	): Promise<AiAssistantSDK.BuilderInstanceCreditsResponse> {
		try {
			return await this.workflowBuilderService.getBuilderInstanceCredits(req.user);
		} catch (e) {
			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}
}
