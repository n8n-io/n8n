import {
	CheckWorkflowRulesDto,
	PutWorkflowRuleSetDto,
	WorkflowRuleSetPublicDto,
	WorkflowRulesCheckPublicDto,
	WorkflowRulesExportPublicDto,
	projectIdParamSchema,
	type WorkflowRuleSetResponse,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	GlobalScope,
	Param,
	Post,
	ProjectScope,
	PublicApiController,
	Put,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ServiceUnavailableError } from '@n8n/errors';
import type { Response } from 'express';

const tags = ['WorkflowRules'];

const PREVIEW =
	'**Preview** — breaking changes may still occur without major version bump. Needs `N8N_ENABLED_MODULES=workflow-rules`.\n\n';

function toPublicRuleSet({ ruleSet, version, updatedAt }: WorkflowRuleSetResponse) {
	return { ruleSet, version, updatedAt };
}

/**
 * Public API for Workflow Rules: rules as code, the export that `n8n-cli` reads offline, and a
 * check that CI calls with workflow JSON. Every route delegates to the services that the internal
 * `/rest` controllers use, so validation and findings are identical on both surfaces.
 */
@PublicApiController('/workflow-rules')
export class WorkflowRulesPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	private async service() {
		if (!this.moduleRegistry.isActive('workflow-rules')) {
			throw new ServiceUnavailableError('The Workflow Rules module is not enabled');
		}
		const { WorkflowRulesService } = await import('@n8n/backend-module-workflow-rules');
		return Container.get(WorkflowRulesService);
	}

	@Get('/')
	@ApiKeyScope('workflowRules:read')
	@GlobalScope('workflowRules:read')
	@ApiSummary('Preview: Retrieve the instance Workflow Rules')
	@ApiDescription(
		`${PREVIEW}Returns the instance rule set. An instance that never saved one returns no rules and \`version: 0\`.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, WorkflowRuleSetPublicDto)
	@ApiErrorResponse(503)
	async getInstanceWorkflowRules(): Promise<WorkflowRuleSetPublicDto> {
		return toPublicRuleSet(await (await this.service()).getRuleSet(null));
	}

	@Put('/')
	@ApiKeyScope('workflowRules:manage')
	@GlobalScope('workflowRules:manage')
	@ApiSummary('Preview: Replace the instance Workflow Rules')
	@ApiDescription(
		`${PREVIEW}Replaces the instance rule set. \`version\` must equal the version last read. A stale value is rejected with 409.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, WorkflowRuleSetPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putInstanceWorkflowRules(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutWorkflowRuleSetDto,
	): Promise<WorkflowRuleSetPublicDto> {
		const service = await this.service();
		return toPublicRuleSet(await service.putRuleSet(null, dto.ruleSet, dto.version, req.user));
	}

	@Get('/projects/:projectId')
	@ApiKeyScope('workflowRules:read')
	@ProjectScope('workflowRules:read')
	@ApiSummary('Preview: Retrieve the Workflow Rules of a project')
	@ApiDescription(`${PREVIEW}Returns the rules that one project adds on top of the instance rules.`)
	@ApiTags(tags)
	@ApiResponse(200, WorkflowRuleSetPublicDto)
	@ApiErrorResponse(503)
	async getProjectWorkflowRules(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<WorkflowRuleSetPublicDto> {
		return toPublicRuleSet(await (await this.service()).getRuleSet(projectId));
	}

	@Put('/projects/:projectId')
	@ApiKeyScope('workflowRules:manage')
	@ProjectScope('workflowRules:manage')
	@ApiSummary('Preview: Replace the Workflow Rules of a project')
	@ApiDescription(
		`${PREVIEW}Replaces the project rule set. A project can make an instance rule stricter. It can lower an instance rule only when the instance marks it adjustable.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, WorkflowRuleSetPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putProjectWorkflowRules(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body dto: PutWorkflowRuleSetDto,
	): Promise<WorkflowRuleSetPublicDto> {
		const service = await this.service();
		return toPublicRuleSet(await service.putRuleSet(projectId, dto.ruleSet, dto.version, req.user));
	}

	@Get('/export')
	@ApiKeyScope('workflowRules:read')
	@GlobalScope('workflowRules:read')
	@ApiSummary('Preview: Export the Workflow Rules for offline checks')
	@ApiDescription(
		`${PREVIEW}Returns the instance rules, every project's rules, the exemptions and the instance defaults. Save it as a file and pass it to \`n8n-cli workflow-rules check --rules\`.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, WorkflowRulesExportPublicDto)
	@ApiErrorResponse(503)
	async exportWorkflowRules(): Promise<WorkflowRulesExportPublicDto> {
		return await (await this.service()).exportBundle();
	}

	@Post('/check')
	@ApiKeyScope('workflowRules:read')
	@GlobalScope('workflowRules:read')
	@ApiSummary('Preview: Check workflows against the Workflow Rules')
	@ApiDescription(
		`${PREVIEW}Evaluates workflow JSON against the live rules and returns every finding. Nothing is saved. \`summary.passed\` is false when a finding blocks publishing. Accepts the source control and n8n package file formats.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, WorkflowRulesCheckPublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(503)
	async checkWorkflowRules(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CheckWorkflowRulesDto,
	): Promise<WorkflowRulesCheckPublicDto> {
		return await (await this.service()).checkWorkflows(dto);
	}
}
