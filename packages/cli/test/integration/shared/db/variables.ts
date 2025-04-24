import { Container } from '@n8n/di';
import { randomString } from 'n8n-workflow';

import { VariablesRepository } from '@n8n/db';
import { generateNanoId } from '@n8n/db';

export async function createVariable(key = randomString(5), value = randomString(5)) {
	return await Container.get(VariablesRepository).save({ id: generateNanoId(), key, value });
}

export async function getVariableOrFail(id: string) {
	return await Container.get(VariablesRepository).findOneOrFail({ where: { id } });
}
