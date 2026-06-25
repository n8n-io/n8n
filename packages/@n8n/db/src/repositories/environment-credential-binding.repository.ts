import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { EnvironmentCredentialBinding } from '../entities/environment-credential-binding';

@Service()
export class EnvironmentCredentialBindingRepository extends Repository<EnvironmentCredentialBinding> {
	constructor(dataSource: DataSource) {
		super(EnvironmentCredentialBinding, dataSource.manager);
	}

	async resolveTargetCredentialId(
		environmentId: string,
		workflowId: string,
		nodeId: string,
		credentialType: string,
	): Promise<string | null> {
		const row = await this.findOne({
			where: { environmentId, workflowId, nodeId, credentialType },
			select: ['targetCredentialId'],
		});
		return row?.targetCredentialId ?? null;
	}

	async findAllByEnvironment(
		environmentId: string,
		workflowId: string,
	): Promise<EnvironmentCredentialBinding[]> {
		return await this.find({ where: { environmentId, workflowId } });
	}

	async replaceAll(
		environmentId: string,
		workflowId: string,
		bindings: Array<{ nodeId: string; credentialType: string; targetCredentialId: string }>,
	): Promise<void> {
		await this.delete({ environmentId, workflowId });
		if (bindings.length === 0) return;
		await this.insert(bindings.map((b) => ({ ...b, environmentId, workflowId })));
	}
}
