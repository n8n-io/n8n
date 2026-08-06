import {
	CreateEncryptionKeyDto,
	ListEncryptionKeysQueryDto,
	type EncryptionKey,
	type EncryptionKeysList,
} from '@n8n/api-types';
import { type DeploymentKey } from '@n8n/db';
import { Body, Get, GlobalScope, Post, Query, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { KeyManagerService } from './key-manager.service';

function toResponseDto(row: DeploymentKey): EncryptionKey {
	return {
		id: row.id,
		type: row.type,
		algorithm: row.algorithm,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

@RestController('/encryption/keys')
export class EncryptionKeyController {
	constructor(private readonly keyManagerService: KeyManagerService) {}

	@Get('/')
	@GlobalScope('encryptionKey:manage')
	async list(
		_req: unknown,
		_res: unknown,
		@Query query: ListEncryptionKeysQueryDto,
	): Promise<EncryptionKeysList> {
		if (
			query.activatedFrom &&
			query.activatedTo &&
			new Date(query.activatedFrom).getTime() > new Date(query.activatedTo).getTime()
		) {
			throw new BadRequestError('activatedFrom must be earlier than or equal to activatedTo');
		}

		const { items, count } = await this.keyManagerService.listKeys(query);
		return { count, items: items.map(toResponseDto) };
	}

	@Post('/')
	@GlobalScope('encryptionKey:manage')
	async create(
		_req: unknown,
		_res: unknown,
		@Body _body: CreateEncryptionKeyDto,
	): Promise<EncryptionKey> {
		const row = await this.keyManagerService.rotateKey();
		return toResponseDto(row);
	}
}
