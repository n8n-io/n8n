import { importClassesFromDirectories } from '../util/DirectoryExportedClassesLoader';
import { OrmUtils } from '../util/OrmUtils';
import { getFromContainer } from '../container';
import { MigrationInterface } from '../migration/MigrationInterface';
import { getMetadataArgsStorage } from '../globals';
import { EntityMetadataBuilder } from '../metadata-builder/EntityMetadataBuilder';
import { EntitySchemaTransformer } from '../entity-schema/EntitySchemaTransformer';
import { DataSource } from '../data-source/DataSource';
import { EntitySchema } from '../entity-schema/EntitySchema';
import { EntityMetadata } from '../metadata/EntityMetadata';
import { EntitySubscriberInterface } from '../subscriber/EntitySubscriberInterface';
import { InstanceChecker } from '../util/InstanceChecker';

/**
 * Builds migration instances, subscriber instances and entity metadatas for the given classes.
 */
export class ConnectionMetadataBuilder {
	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(protected connection: DataSource) {}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Builds migration instances for the given classes or directories.
	 */
	async buildMigrations(migrations: (Function | string)[]): Promise<MigrationInterface[]> {
		const [migrationClasses, migrationDirectories] = OrmUtils.splitClassesAndStrings(migrations);
		const allMigrationClasses = [
			...migrationClasses,
			...(await importClassesFromDirectories(this.connection.logger, migrationDirectories)),
		];
		return allMigrationClasses.map((migrationClass) =>
			getFromContainer<MigrationInterface>(migrationClass),
		);
	}

	/**
	 * Builds subscriber instances for the given classes or directories.
	 */
	async buildSubscribers(
		subscribers: (Function | string)[],
	): Promise<EntitySubscriberInterface<any>[]> {
		const [subscriberClasses, subscriberDirectories] = OrmUtils.splitClassesAndStrings(
			subscribers || [],
		);
		const allSubscriberClasses = [
			...subscriberClasses,
			...(await importClassesFromDirectories(this.connection.logger, subscriberDirectories)),
		];
		return getMetadataArgsStorage()
			.filterSubscribers(allSubscriberClasses)
			.map((metadata) => getFromContainer<EntitySubscriberInterface<any>>(metadata.target));
	}

	/**
	 * Builds entity metadatas for the given classes or directories.
	 */
	async buildEntityMetadatas(
		entities: (Function | EntitySchema<any> | string)[],
	): Promise<EntityMetadata[]> {
		// todo: instead we need to merge multiple metadata args storages

		const [entityClassesOrSchemas, entityDirectories] = OrmUtils.splitClassesAndStrings(
			entities || [],
		);
		const entityClasses: Function[] = entityClassesOrSchemas.filter(
			(entityClass) => !InstanceChecker.isEntitySchema(entityClass),
		) as any;
		const entitySchemas: EntitySchema<any>[] = entityClassesOrSchemas.filter((entityClass) =>
			InstanceChecker.isEntitySchema(entityClass),
		) as any;

		const allEntityClasses = [
			...entityClasses,
			...(await importClassesFromDirectories(this.connection.logger, entityDirectories)),
		];
		allEntityClasses.forEach((entityClass) => {
			// if we have entity schemas loaded from directories
			if (InstanceChecker.isEntitySchema(entityClass)) {
				entitySchemas.push(entityClass);
			}
		});
		const decoratorEntityMetadatas = new EntityMetadataBuilder(
			this.connection,
			getMetadataArgsStorage(),
		).build(allEntityClasses);

		const metadataArgsStorageFromSchema = new EntitySchemaTransformer().transform(entitySchemas);
		const schemaEntityMetadatas = new EntityMetadataBuilder(
			this.connection,
			metadataArgsStorageFromSchema,
		).build();

		return [...decoratorEntityMetadatas, ...schemaEntityMetadatas];
	}
}
