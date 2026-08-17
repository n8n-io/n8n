import {
	CreateRoleDto,
	RoleAssignmentsResponseDto,
	RoleDeleteQueryDto,
	RoleGetQueryDto,
	RoleListQueryDto,
	RoleMembersResponseDto,
	RoleProjectMembersResponseDto,
	UpdateRoleDto,
} from '@n8n/api-types';
import type {
	RoleAssignmentsResponse,
	RoleMembersResponse,
	RoleProjectMembersResponse,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import { Role as RoleDTO } from '@n8n/permissions';

import { EventService } from '@/events/event.service';
import { assertCanManageRoleType, canReassignUsers } from '@/services/role-authorization';
import { RoleService } from '@/services/role.service';

@RestController('/roles')
export class RoleController {
	constructor(
		private readonly roleService: RoleService,
		private readonly eventService: EventService,
	) {}

	@Get('/')
	async getAllRoles(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: RoleListQueryDto,
	): Promise<Record<string, RoleDTO[]>> {
		const allRoles = await this.roleService.getAllRoles(query.withUsageCount);
		return {
			global: allRoles.filter((r) => r.roleType === 'global'),
			project: allRoles.filter((r) => r.roleType === 'project'),
			credential: allRoles.filter((r) => r.roleType === 'credential'),
			workflow: allRoles.filter((r) => r.roleType === 'workflow'),
		};
	}

	@Get('/:slug/assignments/:projectId/members')
	async getRoleProjectMembers(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
		@Param('projectId') projectId: string,
	): Promise<RoleProjectMembersResponse> {
		const role = await this.roleService.getRole(slug);
		assertCanManageRoleType({
			roleType: role.roleType,
			user: req.user,
		});
		const result = await this.roleService.getRoleProjectMembers(slug, projectId);
		return RoleProjectMembersResponseDto.parse(result);
	}

	@Get('/:slug/assignments')
	async getRoleAssignments(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
	): Promise<RoleAssignmentsResponse> {
		const role = await this.roleService.getRole(slug);
		assertCanManageRoleType({
			roleType: role.roleType,
			user: req.user,
		});
		const result = await this.roleService.getRoleAssignments(slug);
		return RoleAssignmentsResponseDto.parse(result);
	}

	@Get('/:slug/members')
	@GlobalScope('role:read')
	async getRoleMembers(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
	): Promise<RoleMembersResponse> {
		const result = await this.roleService.getRoleMembers(slug);
		return RoleMembersResponseDto.parse(result);
	}

	@Get('/:slug')
	async getRoleBySlug(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
		@Query query: RoleGetQueryDto,
	): Promise<RoleDTO> {
		return await this.roleService.getRole(slug, query.withUsageCount);
	}

	@Patch('/:slug')
	@Licensed(LICENSE_FEATURES.CUSTOM_ROLES)
	async updateRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
		@Body updateRole: UpdateRoleDto,
	): Promise<RoleDTO> {
		const role = await this.roleService.getRole(slug);
		assertCanManageRoleType({
			roleType: role.roleType,
			user: req.user,
		});
		return await this.roleService.updateCustomRole({
			slug,
			newRole: updateRole,
			userId: req.user.id,
		});
	}

	@Delete('/:slug')
	@Licensed(LICENSE_FEATURES.CUSTOM_ROLES)
	async deleteRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('slug') slug: string,
		@Query query: RoleDeleteQueryDto,
	): Promise<RoleDTO> {
		const role = await this.roleService.getRole(slug);
		assertCanManageRoleType({
			roleType: role.roleType,
			user: req.user,
		});
		const reassignRoleSlug = canReassignUsers({ role, user: req.user })
			? query.reassignRoleSlug
			: undefined;
		return await this.roleService.removeCustomRole({
			slug,
			reassignRoleSlug,
			userId: req.user.id,
		});
	}

	@Post('/')
	@Licensed(LICENSE_FEATURES.CUSTOM_ROLES)
	async createRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Body createRole: CreateRoleDto,
	): Promise<RoleDTO> {
		assertCanManageRoleType({
			roleType: createRole.roleType,
			user: req.user,
		});
		const result = await this.roleService.createCustomRole(createRole);
		this.eventService.emit('custom-role-created', {
			userId: req.user.id,
			roleSlug: result.slug,
			scopes: result.scopes,
		});
		return result;
	}
}
