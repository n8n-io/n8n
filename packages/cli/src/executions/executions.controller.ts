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
		return ExecutionsService.getExecutionsList(req);
	}

	@Get('/:id')
	async getExecution(req: ExecutionRequest.Get) {
		return isSharingEnabled()
			? EnterpriseExecutionsService.getExecution(req)
			: ExecutionsService.getExecution(req);
	}

	@Post('/:id/retry')
	async retryExecution(req: ExecutionRequest.Retry) {
		return ExecutionsService.retryExecution(req);
	}

	@Post('/delete')
	async deleteExecutions(req: ExecutionRequest.Delete) {
		return ExecutionsService.deleteExecutions(req);
	}
}
