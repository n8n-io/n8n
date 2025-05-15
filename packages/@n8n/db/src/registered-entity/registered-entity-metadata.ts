import { Service } from '@n8n/di';
import type { BaseEntity } from '@n8n/typeorm';

import { EntityAlreadyRegisteredError } from './entity-already-registered.error';

export type RegisteredEntityClass = new (...args: unknown[]) => BaseEntity;

@Service()
export class RegisteredEntityMetadata {
	private readonly entities: Map<string, RegisteredEntityClass> = new Map();

	register(entityClass: RegisteredEntityClass) {
		if (this.entities.has(entityClass.name)) {
			throw new EntityAlreadyRegisteredError(entityClass.name);
		}

		this.entities.set(entityClass.name, entityClass);
	}

	getEntities() {
		return [...this.entities.values()];
	}
}
