import {
	CreateDestinationDto,
	DeleteDestinationQueryDto,
	GetDestinationQueryDto,
	TestDestinationQueryDto,
} from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Licensed, Post, Query, RestController } from '@n8n/decorators';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { eventNamesAll } from '@/eventbus/event-message-classes';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { createMessageEventBusDestination } from './create-message-event-bus-destination';
import { assertUserCanUseDestinationCredentials } from './destinations/destination-credentials-access';
import { LogStreamingDestinationService } from './log-streaming-destination.service';

@RestController('/eventbus')
export class EventBusController {
	constructor(
		private readonly eventBus: MessageEventBus,
		private readonly destinationService: LogStreamingDestinationService,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	private assertNotManagedByEnv() {
		if (this.instanceSettingsLoaderConfig.logStreamingManagedByEnv) {
			throw new ForbiddenError(
				'Log streaming destinations are managed via environment variables and cannot be modified through the API',
			);
		}
	}

	@Get('/eventnames')
	async getEventNames(): Promise<string[]> {
		return eventNamesAll;
	}

	@Licensed('feat:logStreaming')
	@Get('/destination')
	@GlobalScope('eventBusDestination:list')
	async getDestination(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Query query: GetDestinationQueryDto,
	): Promise<MessageEventBusDestinationOptions[]> {
		return await this.destinationService.findDestination(query.id);
	}

	@Licensed('feat:logStreaming')
	@Post('/destination')
	@GlobalScope('eventBusDestination:create')
	async postDestination(req: AuthenticatedRequest): Promise<MessageEventBusDestinationOptions> {
		this.assertNotManagedByEnv();

		// Manually validate using the discriminated union schema since TypeScript reflection doesn't work with plain Zod schemas
		// And ZodClass doesn't support discriminated unions directly
		const parseResult = CreateDestinationDto.safeParse(req.body);
		if (!parseResult.success) {
			throw new BadRequestError(parseResult.error.errors[0].message);
		}

		const options = parseResult.data as MessageEventBusDestinationOptions;

		await assertUserCanUseDestinationCredentials(this.credentialsFinderService, req.user, options);

		const destination = createMessageEventBusDestination(this.eventBus, this.outboundHttp, options);
		const result = await this.destinationService.addDestination(destination);

		return result.serialize();
	}

	@Licensed('feat:logStreaming')
	@Get('/testmessage')
	@GlobalScope('eventBusDestination:test')
	async sendTestMessage(
		req: AuthenticatedRequest,
		_res: unknown,
		@Query query: TestDestinationQueryDto,
	): Promise<boolean> {
		// Testing decrypts and sends the destination's stored credential, so the
		// caller must have access to it — mirrors the check on create/update.
		const [destination] = await this.destinationService.findDestination(query.id);
		if (destination) {
			await assertUserCanUseDestinationCredentials(
				this.credentialsFinderService,
				req.user,
				destination,
			);
		}
		return await this.destinationService.testDestination(query.id);
	}

	@Licensed('feat:logStreaming')
	@Delete('/destination')
	@GlobalScope('eventBusDestination:delete')
	async deleteDestination(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Query query: DeleteDestinationQueryDto,
	): Promise<void> {
		this.assertNotManagedByEnv();
		await this.destinationService.removeDestination(query.id);
	}
}
