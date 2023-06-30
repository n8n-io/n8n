import type { WorkflowEntityWithVersion } from '@/databases/entities/WorkflowEntityWithVersion';
import { collections } from '@/Db';

export class WorkflowsWithVersionService {
	static async getAll(): Promise<WorkflowEntityWithVersion[]> {
		return collections.WorkflowWithVersion.find();
	}

	static async getAllForWorkflow(id: string): Promise<WorkflowEntityWithVersion[]> {
		return collections.WorkflowWithVersion.find({
			where: { id },
		});
	}

	static async getOneForWorkflowAndVersion(
		id: string,
		versionId: string,
	): Promise<WorkflowEntityWithVersion[]> {
		return collections.WorkflowWithVersion.find({
			where: { id, versionId },
		});
	}
}
