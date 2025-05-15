import { Service } from '@n8n/di';
import type { Class } from 'n8n-core';

import * as entities from './entities';

export type EntityName = keyof typeof entities;

@Service()
export class EntityRegistry {
	readonly registered: Class[] = Object.values(entities);

	registerEntities(...toRegister: Class[]) {
		this.registered.push(...toRegister);
	}
}
