import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Param, Post, RestController } from '@n8n/decorators';

import type { ConnectParams, ReconcileParams } from './branch-sync.service';
import { BranchSyncService } from './branch-sync.service';
import { ProposalService } from './proposals/proposal.service';

interface ProposalBody {
	name?: string;
	choices?: Record<string, 'head' | 'live'>;
}

/**
 * POC surface for LIGO-819 branch tracking. Same shortcut as the promotions
 * POC: no dedicated scopes yet, everything borrows `sourceControl:manage`, and
 * bodies are read untyped from the request.
 */
@RestController('/branch-sync')
export class BranchSyncController {
	constructor(
		private readonly branchSyncService: BranchSyncService,
		private readonly proposalService: ProposalService,
	) {}

	@Post('/scopes')
	@GlobalScope('sourceControl:manage')
	async connect(req: AuthenticatedRequest) {
		return await this.branchSyncService.connect(req.body as ConnectParams);
	}

	@Get('/scopes')
	@GlobalScope('sourceControl:manage')
	async listScopes() {
		return await this.branchSyncService.listScopes();
	}

	@Get('/scopes/:scopeKey/plan')
	@GlobalScope('sourceControl:manage')
	async plan(req: AuthenticatedRequest, _res: unknown, @Param('scopeKey') scopeKey: string) {
		const { to } = req.query as { to?: string };
		return await this.branchSyncService.plan(scopeKey, { to });
	}

	@Get('/scopes/:scopeKey/commits')
	@GlobalScope('sourceControl:manage')
	async listCommits(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('scopeKey') scopeKey: string,
	) {
		return await this.branchSyncService.listCommits(scopeKey);
	}

	@Post('/scopes/:scopeKey/sync')
	@GlobalScope('sourceControl:manage')
	async sync(req: AuthenticatedRequest, _res: unknown, @Param('scopeKey') scopeKey: string) {
		return await this.branchSyncService.sync(scopeKey, req.body as ReconcileParams, req.user);
	}

	@Post('/scopes/:scopeKey/proposals')
	@GlobalScope('sourceControl:manage')
	async createProposal(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('scopeKey') scopeKey: string,
	) {
		const { name, choices } = req.body as ProposalBody;
		return await this.proposalService.create(scopeKey, name ?? 'draft', choices);
	}

	@Get('/scopes/:scopeKey/proposals/:name')
	@GlobalScope('sourceControl:manage')
	async proposalStatus(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('scopeKey') scopeKey: string,
		@Param('name') name: string,
	) {
		return await this.proposalService.status(scopeKey, name);
	}

	@Post('/scopes/:scopeKey/proposals/:name/refresh')
	@GlobalScope('sourceControl:manage')
	async refreshProposal(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('scopeKey') scopeKey: string,
		@Param('name') name: string,
	) {
		const { choices } = req.body as ProposalBody;
		return await this.proposalService.refresh(scopeKey, name, choices);
	}

	@Post('/scopes/:scopeKey/proposals/:name/update-from-live')
	@GlobalScope('sourceControl:manage')
	async updateProposalFromLive(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('scopeKey') scopeKey: string,
		@Param('name') name: string,
	) {
		const { choices } = req.body as ProposalBody;
		return await this.proposalService.updateFromLive(scopeKey, name, choices);
	}

	@Post('/scopes/:scopeKey/proposals/:name/merge')
	@GlobalScope('sourceControl:manage')
	async mergeProposal(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('scopeKey') scopeKey: string,
		@Param('name') name: string,
	) {
		return await this.proposalService.merge(scopeKey, name);
	}
}
