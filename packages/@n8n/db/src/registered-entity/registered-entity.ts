import { Container } from '@n8n/di';
import { Entity, BaseEntity } from '@n8n/typeorm';

import { NotBaseEntityError } from './not-base-entity.error';
import type { RegisteredEntityClass } from './registered-entity-metadata';
import { RegisteredEntityMetadata } from './registered-entity-metadata';

// eslint-disable-next-line @typescript-eslint/ban-types
function isBaseEntityClass(value: Function): value is RegisteredEntityClass {
	return value.prototype instanceof BaseEntity;
}

/**
 * Decorator that combines typeorm's `@Entity` with loading the entity class
 * in memory, so we can later register it when connecting to the DB.
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
		if (!isBaseEntityClass(entityClass)) throw new NotBaseEntityError(entityClass.name);

		Container.get(RegisteredEntityMetadata).register(entityClass);

		return Entity(name)(entityClass);
	};
