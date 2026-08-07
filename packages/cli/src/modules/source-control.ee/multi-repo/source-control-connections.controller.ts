import { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Patch, Post, RestController } from '@n8n/decorators';

import type {
	ClaimScopePayload,
	ConnectionPushRequest,
	ConnectionResponse,
	CreateConnectionPayload,
	UpdateConnectionPayload,
} from './multi-repo.types';
import { SourceControlConnectionService } from './source-control-connection.service';
import { SourceControlSyncService } from './source-control-sync.service';
import type { KeyPairType } from '../types/key-pair-type';

type ConnectionRequest<Body = unknown> = AuthenticatedRequest<
	{ connectionId: string; projectId?: string },
	unknown,
	Body
>;

/**
 * Multi-repo source control connections (LIGO-923 POC). Lives beside the legacy
 * singleton controller under a distinct prefix; request bodies are plain module
 * types instead of zod DTOs — promote to @n8n/api-types when this graduates.
 */
@RestController('/source-control/connections')
export class SourceControlConnectionsController {
	constructor(
		private readonly connectionService: SourceControlConnectionService,
		private readonly syncService: SourceControlSyncService,
	) {}

	@Get('/')
	@GlobalScope('sourceControl:manage')
	async listConnections(): Promise<ConnectionResponse[]> {
		return await this.connectionService.list();
	}

	@Post('/')
	@GlobalScope('sourceControl:manage')
	async createConnection(req: ConnectionRequest<CreateConnectionPayload>) {
		return await this.connectionService.create(req.body);
	}

	@Patch('/:connectionId')
	@GlobalScope('sourceControl:manage')
	async updateConnection(req: ConnectionRequest<UpdateConnectionPayload>) {
		return await this.connectionService.update(req.params.connectionId, req.body);
	}

	@Delete('/:connectionId')
	@GlobalScope('sourceControl:manage')
	async deleteConnection(req: ConnectionRequest) {
		await this.connectionService.delete(req.params.connectionId);
		return { success: true };
	}

	@Post('/:connectionId/connect')
	@GlobalScope('sourceControl:manage')
	async connect(req: ConnectionRequest) {
		return await this.connectionService.connect(req.params.connectionId, req.user);
	}

	@Post('/:connectionId/disconnect')
	@GlobalScope('sourceControl:manage')
	async disconnect(req: ConnectionRequest) {
		return await this.connectionService.disconnect(req.params.connectionId);
	}

	@Post('/:connectionId/generate-key-pair')
	@GlobalScope('sourceControl:manage')
	async generateKeyPair(req: ConnectionRequest<{ keyGeneratorType?: KeyPairType }>) {
		return await this.connectionService.regenerateKeyPair(
			req.params.connectionId,
			req.body.keyGeneratorType,
		);
	}

	@Get('/:connectionId/branches')
	@GlobalScope('sourceControl:manage')
	async getBranches(req: ConnectionRequest) {
		return await this.connectionService.getBranches(req.params.connectionId);
	}

	@Post('/:connectionId/scopes')
	@GlobalScope('sourceControl:manage')
	async claimScope(req: ConnectionRequest<ClaimScopePayload>) {
		await this.connectionService.claimScope(req.params.connectionId, req.body);
		return { success: true };
	}

	@Delete('/:connectionId/scopes/project/:projectId')
	@GlobalScope('sourceControl:manage')
	async unclaimProject(req: ConnectionRequest) {
		await this.connectionService.unclaimProject(req.params.projectId!);
		return { success: true };
	}

	@Delete('/:connectionId/scopes/instance')
	@GlobalScope('sourceControl:manage')
	async removeInstanceScope(req: ConnectionRequest) {
		await this.connectionService.removeInstanceScope(req.params.connectionId);
		return { success: true };
	}

	@Get('/:connectionId/status')
	@GlobalScope('sourceControl:push')
	async status(req: ConnectionRequest) {
		return await this.syncService.status(req.params.connectionId, req.user);
	}

	@Post('/:connectionId/push')
	@GlobalScope('sourceControl:push')
	async push(req: ConnectionRequest<ConnectionPushRequest>) {
		return await this.syncService.push(req.params.connectionId, req.user, req.body.commitMessage);
	}

	@Post('/:connectionId/pull')
	@GlobalScope('sourceControl:pull')
	async pull(req: ConnectionRequest) {
		return await this.syncService.pull(req.params.connectionId, req.user);
	}
}
