import {
	CreatePolicyDto,
	UpdatePolicyDto,
	CreateCategoryDto,
	UpdateCategoryDto,
	CategoryAssignmentDto,
	CreateAccessRequestDto,
	ReviewAccessRequestDto,
	GetNodeGovernanceQueryDto,
	GetNodeGovernanceBodyDto,
	ImportCategoriesDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeGovernanceService } from '@/services/node-governance.service';

@RestController('/node-governance')
export class NodeGovernanceController {
	constructor(private readonly nodeGovernanceService: NodeGovernanceService) {}

	// === Node Governance Status ===

	// POST endpoint (preferred - no URL length limits)
	@Post('/status')
	async getNodeGovernanceStatusPost(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: GetNodeGovernanceBodyDto,
	) {
		const { projectId, nodeTypes } = body;

		if (!nodeTypes || nodeTypes.length === 0) {
			return { governance: {} };
		}

		const governanceMap = await this.nodeGovernanceService.getGovernanceForNodes(
			nodeTypes,
			projectId,
			req.user.id,
		);

		const governance: Record<string, unknown> = {};
		for (const [nodeType, status] of governanceMap) {
			governance[nodeType] = status;
		}

		return { governance };
	}

	// GET endpoint (legacy - may hit URL length limits with many nodes)
	@Get('/status')
	async getNodeGovernanceStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: GetNodeGovernanceQueryDto,
	) {
		const { projectId, nodeTypes } = query;
		const nodeTypeList = nodeTypes ? nodeTypes.split(',') : [];

		if (nodeTypeList.length === 0) {
			return { governance: {} };
		}

		const governanceMap = await this.nodeGovernanceService.getGovernanceForNodes(
			nodeTypeList,
			projectId,
			req.user.id,
		);

		const governance: Record<string, unknown> = {};
		for (const [nodeType, status] of governanceMap) {
			governance[nodeType] = status;
		}

		return { governance };
	}

	// === Policies ===

	@Get('/policies')
	@GlobalScope('nodeGovernance:manage')
	async getAllPolicies() {
		const policies = await this.nodeGovernanceService.getAllPolicies();
		return { policies };
	}

	@Get('/policies/global')
	async getGlobalPolicies() {
		const policies = await this.nodeGovernanceService.getGlobalPolicies();
		return { policies };
	}

	@Get('/policies/project/:projectId')
	async getProjectPolicies(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		const policies = await this.nodeGovernanceService.getProjectPolicies(projectId);
		return { policies };
	}

	@Post('/policies')
	@GlobalScope('nodeGovernance:manage')
	async createPolicy(req: AuthenticatedRequest, _res: Response, @Body payload: CreatePolicyDto) {
		if (payload.scope === 'projects' && (!payload.projectIds || payload.projectIds.length === 0)) {
			throw new BadRequestError('Project IDs are required for project-scoped policies');
		}

		const policy = await this.nodeGovernanceService.createPolicy(payload, req.user);
		return { policy };
	}

	@Patch('/policies/:id')
	@GlobalScope('nodeGovernance:manage')
	async updatePolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdatePolicyDto,
	) {
		const policy = await this.nodeGovernanceService.updatePolicy(id, payload);
		if (!policy) {
			throw new NotFoundError(`Policy with ID ${id} not found`);
		}
		return { policy };
	}

	@Delete('/policies/:id')
	@GlobalScope('nodeGovernance:manage')
	async deletePolicy(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		await this.nodeGovernanceService.deletePolicy(id);
		return { success: true };
	}

	// === Categories ===

	@Get('/categories')
	async getAllCategories() {
		const categories = await this.nodeGovernanceService.getAllCategories();
		return { categories };
	}

	@Post('/categories')
	@GlobalScope('nodeGovernance:manage')
	async createCategory(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateCategoryDto,
	) {
		const category = await this.nodeGovernanceService.createCategory(payload, req.user);
		return { category };
	}

	@Patch('/categories/:id')
	@GlobalScope('nodeGovernance:manage')
	async updateCategory(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdateCategoryDto,
	) {
		const category = await this.nodeGovernanceService.updateCategory(id, payload);
		if (!category) {
			throw new NotFoundError(`Category with ID ${id} not found`);
		}
		return { category };
	}

	@Delete('/categories/:id')
	@GlobalScope('nodeGovernance:manage')
	async deleteCategory(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		await this.nodeGovernanceService.deleteCategory(id);
		return { success: true };
	}

	@Post('/categories/:id/nodes')
	@GlobalScope('nodeGovernance:manage')
	async assignNodeToCategory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') categoryId: string,
		@Body payload: CategoryAssignmentDto,
	) {
		const assignment = await this.nodeGovernanceService.assignNodeToCategory(
			categoryId,
			payload.nodeType,
			req.user,
		);
		return { assignment };
	}

	@Delete('/categories/:id/nodes/:nodeType')
	@GlobalScope('nodeGovernance:manage')
	async removeNodeFromCategory(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') categoryId: string,
		@Param('nodeType') nodeType: string,
	) {
		await this.nodeGovernanceService.removeNodeFromCategory(
			categoryId,
			decodeURIComponent(nodeType),
		);
		return { success: true };
	}

	// === Import/Export ===

	@Get('/export')
	@GlobalScope('nodeGovernance:manage')
	async exportCategories() {
		const exportData = await this.nodeGovernanceService.exportCategories();
		return exportData;
	}

	@Post('/import')
	@GlobalScope('nodeGovernance:manage')
	async importCategories(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ImportCategoriesDto,
	) {
		const result = await this.nodeGovernanceService.importCategories(payload, req.user);
		return result;
	}

	// === Access Requests ===

	@Get('/requests')
	@GlobalScope('nodeGovernance:manage')
	async getPendingRequests() {
		const requests = await this.nodeGovernanceService.getPendingRequests();
		return { requests };
	}

	@Get('/requests/my')
	async getMyRequests(req: AuthenticatedRequest) {
		const requests = await this.nodeGovernanceService.getRequestsByUser(req.user.id);
		return { requests };
	}

	@Post('/requests')
	async createAccessRequest(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateAccessRequestDto,
	) {
		const result = await this.nodeGovernanceService.createAccessRequest(payload, req.user);

		if (result.alreadyExists) {
			return {
				alreadyExists: true,
				request: result.request,
				message: 'A pending request for this node in this project already exists',
			};
		}

		return { alreadyExists: false, request: result.request };
	}

	@Post('/requests/:id/review')
	@GlobalScope('nodeGovernance:manage')
	async reviewAccessRequest(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: ReviewAccessRequestDto,
	) {
		let request;

		if (payload.action === 'approve') {
			// Use policyId if provided, otherwise undefined (which will create a new policy)
			// For backward compatibility: if createPolicy is explicitly false, don't create policy (policyId stays undefined)
			// Otherwise, create a new policy (policyId is undefined, which triggers policy creation)
			const policyId = payload.policyId;
			request = await this.nodeGovernanceService.approveRequest(
				id,
				req.user,
				payload.comment,
				policyId,
			);
		} else {
			request = await this.nodeGovernanceService.rejectRequest(id, req.user, payload.comment);
		}

		if (!request) {
			throw new NotFoundError(`Request with ID ${id} not found`);
		}

		return { request };
	}
}
