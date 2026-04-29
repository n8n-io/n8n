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
	UpdateGovernanceSettingsDto,
	UpdateProjectGovernanceSettingsDto,
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
import { EventService } from '@/events/event.service';
import type { UserLike } from '@/events/maps/relay.event-map';
import { NodeGovernanceService } from '@/services/node-governance.service';

function toUserLike(user: AuthenticatedRequest['user']): UserLike {
	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
	};
}

@RestController('/node-governance')
export class NodeGovernanceController {
	constructor(
		private readonly nodeGovernanceService: NodeGovernanceService,
		private readonly eventService: EventService,
	) {}

	// === Node Governance Status ===

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

	// === Governance Settings (Default Behavior) ===

	@Get('/settings')
	@GlobalScope('nodeGovernance:manage')
	async getGovernanceSettings() {
		return await this.nodeGovernanceService.getGovernanceSettings();
	}

	@Patch('/settings')
	@GlobalScope('nodeGovernance:manage')
	async updateGovernanceSettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: UpdateGovernanceSettingsDto,
	) {
		await this.nodeGovernanceService.setGlobalDefaultBehavior(payload.defaultBehavior);

		this.eventService.emit('node-governance-settings-updated', {
			user: toUserLike(req.user),
			defaultBehavior: payload.defaultBehavior,
		});

		return await this.nodeGovernanceService.getGovernanceSettings();
	}

	@Get('/settings/project/:projectId')
	@GlobalScope('nodeGovernance:manage')
	async getProjectGovernanceSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		const defaultBehavior = await this.nodeGovernanceService.getProjectDefaultBehavior(projectId);
		return { projectId, defaultBehavior };
	}

	@Patch('/settings/project/:projectId')
	@GlobalScope('nodeGovernance:manage')
	async updateProjectGovernanceSettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body payload: UpdateProjectGovernanceSettingsDto,
	) {
		const { projectName } = await this.nodeGovernanceService.setProjectDefaultBehavior(
			projectId,
			payload.defaultBehavior,
		);

		this.eventService.emit('node-governance-settings-updated', {
			user: toUserLike(req.user),
			defaultBehavior: payload.defaultBehavior ?? 'inherit',
			projectId,
			projectName,
		});

		return {
			projectId,
			defaultBehavior: payload.defaultBehavior,
		};
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

		if (policy) {
			this.eventService.emit('node-governance-policy-created', {
				user: toUserLike(req.user),
				policyId: policy.id,
				policyType: policy.policyType,
				scope: policy.scope,
				targetType: policy.targetType,
				targetValue: policy.targetValue,
				projectIds: payload.projectIds,
			});
		}

		return { policy };
	}

	@Patch('/policies/:id')
	@GlobalScope('nodeGovernance:manage')
	async updatePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdatePolicyDto,
	) {
		if (payload.scope === 'projects' && (!payload.projectIds || payload.projectIds.length === 0)) {
			throw new BadRequestError('Project IDs are required for project-scoped policies');
		}

		const policy = await this.nodeGovernanceService.updatePolicy(id, payload);
		if (!policy) {
			throw new NotFoundError(`Policy with ID ${id} not found`);
		}

		this.eventService.emit('node-governance-policy-updated', {
			user: toUserLike(req.user),
			policyId: id,
			policyType: payload.policyType,
			scope: payload.scope,
			targetType: payload.targetType,
			targetValue: payload.targetValue,
			projectIds: payload.projectIds,
		});

		return { policy };
	}

	@Delete('/policies/:id')
	@GlobalScope('nodeGovernance:manage')
	async deletePolicy(req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		await this.nodeGovernanceService.deletePolicy(id);

		this.eventService.emit('node-governance-policy-deleted', {
			user: toUserLike(req.user),
			policyId: id,
		});

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

		this.eventService.emit('node-governance-category-created', {
			user: toUserLike(req.user),
			categoryId: category.id,
			categorySlug: category.slug,
			categoryDisplayName: category.displayName,
		});

		return { category };
	}

	@Patch('/categories/:id')
	@GlobalScope('nodeGovernance:manage')
	async updateCategory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdateCategoryDto,
	) {
		const category = await this.nodeGovernanceService.updateCategory(id, payload);
		if (!category) {
			throw new NotFoundError(`Category with ID ${id} not found`);
		}

		this.eventService.emit('node-governance-category-updated', {
			user: toUserLike(req.user),
			categoryId: id,
			categorySlug: payload.slug,
			categoryDisplayName: payload.displayName,
		});

		return { category };
	}

	@Delete('/categories/:id')
	@GlobalScope('nodeGovernance:manage')
	async deleteCategory(req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		await this.nodeGovernanceService.deleteCategory(id);

		this.eventService.emit('node-governance-category-deleted', {
			user: toUserLike(req.user),
			categoryId: id,
		});

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

		this.eventService.emit('node-governance-category-node-assigned', {
			user: toUserLike(req.user),
			categoryId,
			nodeType: payload.nodeType,
		});

		return { assignment };
	}

	@Delete('/categories/:id/nodes/:nodeType')
	@GlobalScope('nodeGovernance:manage')
	async removeNodeFromCategory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') categoryId: string,
		@Param('nodeType') nodeType: string,
	) {
		const decodedNodeType = decodeURIComponent(nodeType);
		await this.nodeGovernanceService.removeNodeFromCategory(categoryId, decodedNodeType);

		this.eventService.emit('node-governance-category-node-removed', {
			user: toUserLike(req.user),
			categoryId,
			nodeType: decodedNodeType,
		});

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

		this.eventService.emit('node-governance-categories-imported', {
			user: toUserLike(req.user),
			importCreated: result.created,
			importUpdated: result.updated,
			importUnchanged: result.unchanged,
		});

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

		if (!result.alreadyExists) {
			this.eventService.emit('node-governance-request-created', {
				user: toUserLike(req.user),
				requestId: result.request.id,
				nodeType: payload.nodeType,
				projectId: payload.projectId,
			});
		}

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
			const policyId = payload.policyId;
			request = await this.nodeGovernanceService.approveRequest(
				id,
				req.user,
				payload.comment,
				policyId,
			);

			if (request) {
				this.eventService.emit('node-governance-request-approved', {
					user: toUserLike(req.user),
					requestId: id,
					nodeType: request.nodeType,
					projectId: request.projectId,
					requestedById: request.requestedById,
					reviewComment: payload.comment,
					policyId,
				});
			}
		} else {
			request = await this.nodeGovernanceService.rejectRequest(id, req.user, payload.comment);

			if (request) {
				this.eventService.emit('node-governance-request-rejected', {
					user: toUserLike(req.user),
					requestId: id,
					nodeType: request.nodeType,
					projectId: request.projectId,
					requestedById: request.requestedById,
					reviewComment: payload.comment,
				});
			}
		}

		if (!request) {
			throw new NotFoundError(`Request with ID ${id} not found`);
		}

		return { request };
	}
}
