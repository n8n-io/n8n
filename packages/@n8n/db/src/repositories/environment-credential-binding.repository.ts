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
		sourceCredentialId: string,
	): Promise<string | null> {
		const row = await this.findOne({
			where: { environmentId, sourceCredentialId },
			select: ['targetCredentialId'],
		});
		return row?.targetCredentialId ?? null;
	}

	async findAllByEnvironment(environmentId: string): Promise<EnvironmentCredentialBinding[]> {
		return await this.find({ where: { environmentId } });
	}

	async replaceAll(
		environmentId: string,
		bindings: Array<{ sourceCredentialId: string; targetCredentialId: string }>,
	): Promise<void> {
		await this.delete({ environmentId });
		if (bindings.length === 0) return;
		await this.insert(bindings.map((b) => ({ ...b, environmentId })));
	}
}
