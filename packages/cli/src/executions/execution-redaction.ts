import type { ExecutionRedactionQueryDto } from '@n8n/api-types';
import type { IExecutionDb, User } from '@n8n/db';

export type ExecutionRedactionOptions = {
	user: User;
} & Pick<ExecutionRedactionQueryDto, 'redactExecutionData'>;

export interface ExecutionRedaction {
	processExecution(
		execution: IExecutionDb,
		options: ExecutionRedactionOptions,
	): Promise<IExecutionDb>;
}
