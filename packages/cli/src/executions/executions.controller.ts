import { ExecutionRequest } from './execution.request';
import { ExecutionsService } from './executions.service';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './executions.service.ee';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';

@Authorized()
@RestController('/executions')
export class ExecutionsController {
	@Get('/')
	async getExecutionsList(req: ExecutionRequest.GetAll) {
		return await ExecutionsService.getExecutionsList(req);
	}

	@Get('/:id')
	async getExecution(req: ExecutionRequest.Get) {
		return isSharingEnabled()
			? await EnterpriseExecutionsService.getExecution(req)
			: await ExecutionsService.getExecution(req);
	}

	@Post('/:id/retry')
	async retryExecution(req: ExecutionRequest.Retry) {
		return await ExecutionsService.retryExecution(req);
	}

	@Post('/delete')
	async deleteExecutions(req: ExecutionRequest.Delete) {
		return await ExecutionsService.deleteExecutions(req);
	}
}
