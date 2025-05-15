import { Container } from '@n8n/di';
import { Entity, BaseEntity } from '@n8n/typeorm';

import { NotBaseEntityError } from './not-base-entity.error';
import type { RegisteredEntityClass } from './registered-entity-metadata';
import { RegisteredEntityMetadata } from './registered-entity-metadata';

/**
 * Decorator that combines typeorm's `@Entity` with loading it in memory,
 * so we can dynamically register module entities with typeorm.
 *
 * @param name Optional name for the entity, passed to typeorm's `@Entity` decorator
 *
 * @example
 * ```ts
 * @RegisteredEntity()
 * export class MyEntity extends BaseEntity {
 *   // ...
 * }
 * ```
 */
export const RegisteredEntity =
	(name?: string): ClassDecorator =>
	(entityClass) => {
		if (!(entityClass.prototype instanceof BaseEntity)) {
			throw new NotBaseEntityError(entityClass.name);
		}

		Container.get(RegisteredEntityMetadata).register(
			entityClass as unknown as RegisteredEntityClass,
		);

		return Entity(name)(entityClass);
	};
