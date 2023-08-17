import { Container, Service } from 'typedi';
import type { Variables } from '@db/entities/Variables';
import { InternalHooks } from '@/InternalHooks';
import { generateNanoId } from '@db/utils/generators';
import { canCreateNewVariable } from './enviromentHelpers';
import { VariablesService } from './variables.service';

export class VariablesLicenseError extends Error {}
export class VariablesValidationError extends Error {}

@Service()
export class EEVariablesService extends VariablesService {
	validateVariable(variable: Omit<Variables, 'id'>): void {
		if (variable.key.length > 50) {
			throw new VariablesValidationError('key cannot be longer than 50 characters');
		}
		if (variable.key.replace(/[A-Za-z0-9_]/g, '').length !== 0) {
			throw new VariablesValidationError('key can only contain characters A-Za-z0-9_');
		}
		if (variable.value?.length > 255) {
			throw new VariablesValidationError('value cannot be longer than 255 characters');
		}
	}

	async create(variable: Omit<Variables, 'id'>): Promise<Variables> {
		if (!canCreateNewVariable(await this.getCount())) {
			throw new VariablesLicenseError('Variables limit reached');
		}
		this.validateVariable(variable);

		void Container.get(InternalHooks).onVariableCreated({ variable_type: variable.type });
		const saveResult = await this.variablesRepository.save({
			...variable,
			id: generateNanoId(),
		});
		await this.updateCache();
		return saveResult;
	}

	async update(id: string, variable: Omit<Variables, 'id'>): Promise<Variables> {
		this.validateVariable(variable);
		await this.variablesRepository.update(id, variable);
		await this.updateCache();
		return (await this.getCached(id))!;
	}
}
