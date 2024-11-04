import { Get, /*Patch, Post,*/ RestController } from '@/decorators';
import { listQueryMiddleware } from '@/middlewares';

import { TestsService } from './tests.service';
import { TestsRequest } from './tests.types';

@RestController('/evaluation/tests')
export class TestsController {
	constructor(private readonly testsService: TestsService) {}

	// private async getAccessibleWorkflowIds(user: User, scope: Scope) {
	// 	if (this.license.isSharingEnabled()) {
	// 		return await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: [scope] });
	// 	} else {
	// 		return await this.workflowSharingService.getSharedWorkflowIds(user, {
	// 			workflowRoles: ['workflow:owner'],
	// 			projectRoles: ['project:personalOwner'],
	// 		});
	// 	}
	// }

	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(req: TestsRequest.GetMany) {
		return await this.testsService.getMany(req.user, req.listQueryOptions);
	}

	// @Get('/:id')
	// async getOne(req: ExecutionRequest.GetOne) {
	// 	if (!isPositiveInteger(req.params.id)) {
	// 		throw new BadRequestError('Execution ID is not a number');
	// 	}
	//
	// 	const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
	//
	// 	if (workflowIds.length === 0) throw new NotFoundError('Execution not found');
	//
	// 	return this.license.isSharingEnabled()
	// 		? await this.enterpriseExecutionService.findOne(req, workflowIds)
	// 		: await this.executionService.findOne(req, workflowIds);
	// }
	//
	// @Post('/delete')
	// async delete(req: ExecutionRequest.Delete) {
	// 	const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
	//
	// 	if (workflowIds.length === 0) throw new NotFoundError('Execution not found');
	//
	// 	return await this.executionService.delete(req, workflowIds);
	// }
	//
	// @Patch('/:id')
	// async update(req: ExecutionRequest.Update) {
	// 	if (!isPositiveInteger(req.params.id)) {
	// 		throw new BadRequestError('Execution ID is not a number');
	// 	}
	//
	// 	const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
	//
	// 	// Fail fast if no workflows are accessible
	// 	if (workflowIds.length === 0) throw new NotFoundError('Execution not found');
	//
	// 	const { body: payload } = req;
	// 	const validatedPayload = validateExecutionUpdatePayload(payload);
	//
	// 	await this.executionService.annotate(req.params.id, validatedPayload, workflowIds);
	//
	// 	return await this.executionService.findOne(req, workflowIds);
	// }
}
