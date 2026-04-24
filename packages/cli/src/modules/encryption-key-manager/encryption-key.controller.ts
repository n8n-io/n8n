import {
	CreateEncryptionKeyDto,
	ListEncryptionKeysQueryDto,
	type EncryptionKeyResponseDto,
} from '@n8n/api-types';
import { type DeploymentKey } from '@n8n/db';
import { Body, Get, GlobalScope, Post, Query, RestController } from '@n8n/decorators';

import { KeyManagerService } from './key-manager.service';

function toResponseDto(row: DeploymentKey): EncryptionKeyResponseDto {
	return {
		id: row.id,
		type: row.type,
		algorithm: row.algorithm,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
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
	): Promise<EncryptionKeyResponseDto[]> {
		const rows = await this.keyManagerService.listKeys(query.type);
		return rows.map(toResponseDto);
	}

	@Post('/')
	@GlobalScope('encryptionKey:manage')
	async create(
		_req: unknown,
		_res: unknown,
		@Body _body: CreateEncryptionKeyDto,
	): Promise<EncryptionKeyResponseDto> {
		const row = await this.keyManagerService.rotateKey();
		return toResponseDto(row);
	}
}
