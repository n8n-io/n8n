import {
	CreateRuntimeCredentialRulePublicDto,
	ProjectRuntimeCredentialRuleListPublicDto,
	ReplaceRuntimeCredentialRulePublicDto,
	RuntimeCredentialRuleImpactDto,
	RuntimeCredentialRuleImpactPublicDto,
	RuntimeCredentialRuleListPublicDto,
	RuntimeCredentialRuleListQueryPublicDto,
	RuntimeCredentialRulePublicDto,
	projectIdParamSchema,
	runtimeCredentialRuleAliasParamSchema,
} from '@n8n/api-types';
import { isEnvFeatureEnabled } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Post,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ServiceUnavailableError } from '@n8n/errors';
import type { Response } from 'express';

import {
	paginateArray,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const tags = ['RuntimeCredentialRule'];

const PREVIEW = '**Preview.** Breaking changes may still occur without a major version bump.\n\n';

/** The module loads only when the feature flag is on, so its services load on demand. */
function assertEnabled() {
	if (!isEnvFeatureEnabled('N8N_ENV_FEAT_RUNTIME_CREDENTIALS')) {
		throw new ServiceUnavailableError('Run-time credentials are not enabled');
	}
}

async function rulesService() {
	assertEnabled();
	const { RuntimeCredentialRulesService } = await import(
		'@/modules/runtime-credentials/runtime-credential-rules.service.js'
	);
	return Container.get(RuntimeCredentialRulesService);
}

/**
 * Public API surface for run-time input rules. Every route calls the same services as the
 * internal `/rest/runtime-credential-rules` controller, so validation and rule reloads are
 * identical on both surfaces.
 */
@PublicApiController('/runtime-credential-rules')
export class RuntimeCredentialRulesPublicController {
	@Get('/')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Preview: List run-time input rules')
	@ApiDescription(
		`${PREVIEW}Returns every rule, from the environment and from the database, in a cursor-paginated list. A rule moves the value at \`path\` out of the trigger output and into a stub credential of type \`credentialType\`.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, RuntimeCredentialRuleListPublicDto)
	@ApiErrorResponse(503)
	async listRuntimeCredentialRules(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: RuntimeCredentialRuleListQueryPublicDto,
	): Promise<RuntimeCredentialRuleListPublicDto> {
		const rules = (await rulesService()).list().sort((a, b) => a.alias.localeCompare(b.alias));
		return paginateArray(rules, resolveOffsetPagination(query));
	}

	@Post('/')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Preview: Create a run-time input rule')
	@ApiDescription(
		`${PREVIEW}Creates a rule in the database and its stub credential. The alias is the identity of the rule. It cannot change later.`,
	)
	@ApiTags(tags)
	@ApiResponse(201, RuntimeCredentialRulePublicDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async createRuntimeCredentialRule(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateRuntimeCredentialRulePublicDto,
	): Promise<RuntimeCredentialRulePublicDto> {
		return await (await rulesService()).create(dto);
	}

	@Post('/impact')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Preview: Check which workflows a run-time input rule affects')
	@ApiDescription(
		`${PREVIEW}Finds the workflows that read the value which a rule with this \`nodeType\` and \`path\` removes from the trigger output. The result is a hint. It can show a workflow that does not break, and it can miss a read that an expression builds at run time.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, RuntimeCredentialRuleImpactPublicDto)
	@ApiErrorResponse(503)
	async checkRuntimeCredentialRuleImpact(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: RuntimeCredentialRuleImpactDto,
	): Promise<RuntimeCredentialRuleImpactPublicDto> {
		assertEnabled();
		const { RuntimeCredentialRuleImpactService } = await import(
			'@/modules/runtime-credentials/runtime-credential-rule-impact.service.js'
		);
		return await Container.get(RuntimeCredentialRuleImpactService).findAffectedWorkflows(
			dto.nodeType,
			dto.path,
		);
	}

	@Get('/:ruleAlias')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Preview: Retrieve a run-time input rule')
	@ApiDescription(PREVIEW.trim())
	@ApiTags(tags)
	@ApiResponse(200, RuntimeCredentialRulePublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getRuntimeCredentialRule(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleAlias', runtimeCredentialRuleAliasParamSchema) ruleAlias: string,
	): Promise<RuntimeCredentialRulePublicDto> {
		return (await rulesService()).get(ruleAlias);
	}

	@Put('/:ruleAlias')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Preview: Replace a run-time input rule')
	@ApiDescription(
		`${PREVIEW}Replaces every editable value of a rule from the database. An absent \`transform\` or \`allowedDomains\` clears the value. The alias and the credential type cannot change. A rule from the environment is rejected with 403.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, RuntimeCredentialRulePublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async replaceRuntimeCredentialRule(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleAlias', runtimeCredentialRuleAliasParamSchema) ruleAlias: string,
		@Body dto: ReplaceRuntimeCredentialRulePublicDto,
	): Promise<RuntimeCredentialRulePublicDto> {
		return await (await rulesService()).replace(ruleAlias, dto);
	}

	@Delete('/:ruleAlias')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Preview: Delete a run-time input rule')
	@ApiDescription(
		`${PREVIEW}Deletes a rule from the database. The stub credential stays, because workflows reference it. A rule from the environment is rejected with 403.`,
	)
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async deleteRuntimeCredentialRule(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleAlias', runtimeCredentialRuleAliasParamSchema) ruleAlias: string,
	): Promise<void> {
		await (await rulesService()).delete(ruleAlias);
	}
}

/** The rules of one project with their effective access. A project admin can read it. */
@PublicApiController('/projects/:projectId/runtime-credential-rules')
export class ProjectRuntimeCredentialRulesPublicController {
	@Get('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manageRequestFed')
	@ProjectScope('credentialTypePolicy:manageRequestFed')
	@ApiSummary("Preview: List a project's run-time input rules")
	@ApiDescription(
		`${PREVIEW}Returns every rule with its effective access in the project. A rule is \`blocked\` when the request-fed credential type policy of the instance or of the project blocks its credential type. \`blockedBy\` names the scope that blocks it.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, ProjectRuntimeCredentialRuleListPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async listProjectRuntimeCredentialRules(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Query query: RuntimeCredentialRuleListQueryPublicDto,
	): Promise<ProjectRuntimeCredentialRuleListPublicDto> {
		assertEnabled();
		const { ProjectRuntimeCredentialRulesService } = await import(
			'@/modules/runtime-credentials/project-runtime-credential-rules.service.js'
		);
		const rules = (
			await Container.get(ProjectRuntimeCredentialRulesService).listForProject(projectId)
		).sort((a, b) => a.alias.localeCompare(b.alias));
		return paginateArray(rules, resolveOffsetPagination(query));
	}
}
