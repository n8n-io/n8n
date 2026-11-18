import { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';

import type { VaultCaptureResponse, VaultStatusResponse } from './vault-capture.service';
import { VaultCaptureService } from './vault-capture.service';
import type { WorkflowDefinitions } from './vault-workflow-definition.service';
import { VaultWorkflowDefinitionService } from './vault-workflow-definition.service';

@RestController('/vault-credentials')
export class VaultCredentialsController {
	constructor(
		private readonly vaultCaptureService: VaultCaptureService,
		private readonly definitionService: VaultWorkflowDefinitionService,
	) {}

	/** Tells the editor whether secrets are entered in the vault. Every signed-in user may ask. */
	@Get('/status')
	status(): VaultStatusResponse {
		return { enabled: this.vaultCaptureService.isEnabled() };
	}

	@Post('/:credentialId/capture')
	@ProjectScope('credential:update')
	async capture(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('credentialId') credentialId: string,
	): Promise<VaultCaptureResponse> {
		return await this.vaultCaptureService.startCapture(req.user, credentialId);
	}

	/**
	 * The definition that a grant is signed for, in the form that the resolver sends to the broker.
	 * The person who approves a workflow hashes this, so the hash does not depend on how the
	 * workflow was saved.
	 */
	@Get('/workflows/:workflowId/definition')
	@ProjectScope('workflow:read')
	async definition(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowDefinitions> {
		const definitions = await this.definitionService.load(workflowId);
		if (!definitions) throw new NotFoundError('Workflow not found');
		return definitions;
	}
}
