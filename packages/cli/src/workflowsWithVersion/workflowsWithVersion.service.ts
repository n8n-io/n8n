import type { WorkflowEntityWithVersion } from '@/databases/entities/WorkflowEntityWithVersion';
import { WorkflowWithVersionRepository } from '@db/repositories/workflowWithVersion.repository';
// import { collections } from '@/Db';
import { Container } from 'typedi';

export class WorkflowsWithVersionService {
	static async getAll(): Promise<WorkflowEntityWithVersion[]> {
		// return collections.WorkflowWithVersion.find();
        return await Container.get(WorkflowWithVersionRepository).find();
	}

	static async getAllForWorkflow(id: string): Promise<WorkflowEntityWithVersion[]> {
		// return collections.WorkflowWithVersion.find({
		// 	where: { id },
		// });
        return await Container.get(WorkflowWithVersionRepository).find({
            where: { id },
        });
	}

	static async getOneForWorkflowAndVersion(
		id: string,
		versionId: string,
	): Promise<WorkflowEntityWithVersion[]> {
        return await Container.get(WorkflowWithVersionRepository).find({
            where: { id, versionId},
        });
	}
}
