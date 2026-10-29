import { CreateTrustedSourceDto, UpdateTrustedSourceDto } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { isUniqueConstraintError, type AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';
import {
	deriveCapabilities,
	type Capability,
	type TrustedSource,
	type TrustedSourceConfigInput,
	type TrustedSourceConfigLatest,
} from '@n8n/inbound-auth';
import type { Response } from 'express';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import { TrustedSourceDiscoveryService } from './trusted-source-discovery.service';
import { TrustedSourceDbStore } from './trusted-source.store';

/** What every caller may see of a source: no issuer, no config, no status. */
type TrustedSourceSummary = {
	id: string;
	name: string;
	capabilities: Capability[];
	surfaces: string[];
};

function toSummary(source: TrustedSource): TrustedSourceSummary {
	return {
		id: source.id,
		name: source.name,
		capabilities: [...deriveCapabilities(source.config, source.metadata)],
		surfaces: Object.keys(source.config.surfaces),
	};
}

/** The stored secret never leaves the instance; the response carries the blanking value instead. */
function redact(source: TrustedSource): TrustedSource {
	const { client } = source.config.authentication;
	if (client?.kind !== 'registered' || client.clientSecret === undefined) return source;
	return {
		...source,
		config: {
			...source.config,
			authentication: {
				...source.config.authentication,
				client: { ...client, clientSecret: CREDENTIAL_BLANKING_VALUE },
			},
		},
	};
}

/**
 * The blanking value in an incoming config means "keep the stored secret", the same contract as
 * credentials. Any other value replaces it; an absent key clears it.
 */
function restoreSecret(
	config: TrustedSourceConfigInput,
	current: TrustedSourceConfigLatest,
): TrustedSourceConfigInput {
	const { client } = config.authentication;
	if (client?.kind !== 'registered' || client.clientSecret !== CREDENTIAL_BLANKING_VALUE) {
		return config;
	}
	const storedClient = current.authentication.client;
	const { clientSecret: _, ...withoutSecret } = client;
	const restored =
		storedClient?.kind === 'registered' && storedClient.clientSecret !== undefined
			? { ...withoutSecret, clientSecret: storedClient.clientSecret }
			: withoutSecret;
	return { ...config, authentication: { ...config.authentication, client: restored } };
}

async function wrapConflict<T>(write: () => Promise<T>): Promise<T> {
	try {
		return await write();
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			throw new ConflictError('A trusted source with this name or issuer already exists');
		}
		throw error;
	}
}

@RestController('/trusted-sources')
export class TrustedSourceController {
	constructor(
		private readonly store: TrustedSourceDbStore,
		private readonly discovery: TrustedSourceDiscoveryService,
		private readonly eventService: EventService,
	) {}

	@Get('/')
	@GlobalScope('trustedSource:list')
	async list(): Promise<TrustedSourceSummary[]> {
		return (await this.store.listAll()).map(toSummary);
	}

	@Get('/:id')
	@GlobalScope('trustedSource:read')
	async get(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		return redact(await this.require(id));
	}

	@Post('/')
	@Licensed('feat:trustedSourceManage')
	@GlobalScope('trustedSource:create')
	async create(req: AuthenticatedRequest, _res: Response, @Body dto: CreateTrustedSourceDto) {
		const { client } = dto.config.authentication;
		// The blanking value stands for a stored secret, and a new source has none to stand for.
		if (client?.kind === 'registered' && client.clientSecret === CREDENTIAL_BLANKING_VALUE) {
			throw new BadRequestError(
				'clientSecret must be a real secret on create, not the blanking value',
			);
		}
		const source = await wrapConflict(async () => await this.store.create(dto));
		this.eventService.emit('trusted-source-created', {
			user: req.user,
			sourceId: source.id,
			issuer: source.issuer,
		});
		return redact(source);
	}

	@Patch('/:id')
	@Licensed('feat:trustedSourceManage')
	@GlobalScope('trustedSource:update')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body dto: UpdateTrustedSourceDto,
	) {
		const current = await this.require(id);
		const { clearBindings = false, config, ...rest } = dto;
		// An empty patch changes nothing, so it writes no row and emits no audit event.
		if (
			rest.name === undefined &&
			rest.issuer === undefined &&
			config === undefined &&
			!clearBindings
		) {
			return redact(current);
		}
		await wrapConflict(
			async () =>
				await this.store.update(
					id,
					{ ...rest, ...(config && { config: restoreSecret(config, current.config) }) },
					{ clearBindings },
				),
		);
		const updated = await this.require(id);
		this.eventService.emit('trusted-source-updated', {
			user: req.user,
			sourceId: updated.id,
			issuer: updated.issuer,
		});
		return redact(updated);
	}

	@Delete('/:id')
	@GlobalScope('trustedSource:delete')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		const source = await this.require(id);
		await this.store.delete(id);
		this.eventService.emit('trusted-source-deleted', {
			user: req.user,
			sourceId: source.id,
			issuer: source.issuer,
		});
	}

	@Post('/:id/check')
	@GlobalScope('trustedSource:update')
	async check(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		await this.require(id);
		// ponytail: shares the cron lease; a check during a cron run returns the row unchanged for at
		// most 60 s. A lease-free path is the upgrade if that window is reported.
		await this.discovery.refresh(id);
		return redact(await this.require(id));
	}

	private async require(id: string): Promise<TrustedSource> {
		const source = await this.store.getById(id);
		if (!source) throw new NotFoundError(`Trusted source "${id}" not found`);
		return source;
	}
}
