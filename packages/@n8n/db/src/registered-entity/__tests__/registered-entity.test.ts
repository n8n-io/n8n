import { Container } from '@n8n/di';
import { BaseEntity } from '@n8n/typeorm';

import { EntityAlreadyRegisteredError } from '../entity-already-registered.error';
import { NotBaseEntityError } from '../not-base-entity.error';
import { RegisteredEntity } from '../registered-entity';
import { RegisteredEntityMetadata } from '../registered-entity-metadata';

describe('@RegisteredEntity decorator', () => {
	let registeredEntityMetadata: RegisteredEntityMetadata;

	beforeEach(() => {
		registeredEntityMetadata = new RegisteredEntityMetadata();
		Container.set(RegisteredEntityMetadata, registeredEntityMetadata);
	});

	it('should register an entity', () => {
		@RegisteredEntity()
		// @ts-expect-error Test
		class TestEntity extends BaseEntity {}

		expect(registeredEntityMetadata.getEntities()).toContain('TestEntity');
	});

	it('should return all registered entities', () => {
		@RegisteredEntity()
		// @ts-expect-error Test
		class TestEntity1 extends BaseEntity {}

		@RegisteredEntity()
		// @ts-expect-error Test
		class TestEntity2 extends BaseEntity {}

		expect(registeredEntityMetadata.getEntities()).toEqual(['TestEntity1', 'TestEntity2']);
	});

	it('should refuse to register an entity if it does not extend BaseEntity', () => {
		expect(() => {
			@RegisteredEntity()
			// @ts-expect-error Test
			class InvalidEntity {}
		}).toThrow(NotBaseEntityError);
	});

	it('should refuse to register an entity if the class name is already taken', () => {
		@RegisteredEntity()
		// @ts-expect-error Test
		class DuplicateEntity extends BaseEntity {}

		expect(() => {
			@RegisteredEntity()
			// @ts-expect-error Test
			class DuplicateEntity extends BaseEntity {}
		}).toThrow(EntityAlreadyRegisteredError);
	});
});
