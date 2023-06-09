import type { IDatabaseCollections } from '@/Interfaces';
import type { SaveRequestStatusEnum } from '@/databases/entities/SaveRequestLog';
import { SaveRequestLog } from '@/databases/entities/SaveRequestLog';
import type {
	SaveRequestLogRepository,
	UserRepository,
	WorkflowRepository,
} from '@/databases/repositories';
import { Post, RestController } from '@/decorators';
import { SaveRequestLogRequest } from '@/requests';
import type { ILogger } from 'n8n-workflow';

@RestController('/save-request-log')
export class SaveRequestLogController {
	private readonly logger: ILogger;

	private saveRequestLogRepository: SaveRequestLogRepository;

	private userRepository: UserRepository;

	private workFlowRepository: WorkflowRepository;

	constructor({
		logger,
		repositories,
	}: {
		logger: ILogger;
		repositories: Pick<IDatabaseCollections, 'User' | 'Workflow' | 'SaveRequestLog'>;
	}) {
		this.logger = logger;
		this.saveRequestLogRepository = repositories.SaveRequestLog;
		this.userRepository = repositories.User;
		this.workFlowRepository = repositories.Workflow;
	}

	@Post('/')
	async addSaveRequestLog(req: SaveRequestLogRequest.Add) {
		const { id: userId } = req.user;

		const { request, response, workflowId, status } = req.body;

		const user = await this.userRepository.findOneOrFail({
			where: { id: userId },
		});

		const workflow = await this.workFlowRepository.findOneOrFail({
			where: { id: workflowId },
		});

		const log = new SaveRequestLog();
		log.request = request;
		log.response = response;
		log.status = status as SaveRequestStatusEnum;
		log.user = user;
		log.workflow = workflow;

		this.saveRequestLogRepository.create();
		const saveRequestLog = await this.saveRequestLogRepository.save(log);

		return saveRequestLog;
	}
}
