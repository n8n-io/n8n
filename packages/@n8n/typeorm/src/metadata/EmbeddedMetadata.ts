import { ColumnMetadata } from './ColumnMetadata';
import { RelationMetadata } from './RelationMetadata';
import { EntityMetadata } from './EntityMetadata';
import { EmbeddedMetadataArgs } from '../metadata-args/EmbeddedMetadataArgs';
import { RelationIdMetadata } from './RelationIdMetadata';
import { RelationCountMetadata } from './RelationCountMetadata';
import { DataSource } from '../data-source/DataSource';
import { EntityListenerMetadata } from './EntityListenerMetadata';
import { IndexMetadata } from './IndexMetadata';
import { UniqueMetadata } from './UniqueMetadata';
import { TypeORMError } from '../error';

/**
 * Contains all information about entity's embedded property.
 */
export class EmbeddedMetadata {
	// ---------------------------------------------------------------------
	// Public Properties
	// ---------------------------------------------------------------------

	/**
	 * Entity metadata where this embedded is.
	 */
	entityMetadata: EntityMetadata;

	/**
	 * Parent embedded in the case if this embedded inside other embedded.
	 */
	parentEmbeddedMetadata?: EmbeddedMetadata;

	/**
	 * Embedded target type.
	 */
	type: Function | string;

	/**
	 * Property name on which this embedded is attached.
	 */
	propertyName: string;

	/**
	 * Gets full path to this embedded property (including embedded property name).
	 * Full path is relevant when embedded is used inside other embeds (one or multiple nested).
	 * For example it will return "counters.subcounters".
	 */
	propertyPath: string;

	/**
	 * Columns inside this embed.
	 */
	columns: ColumnMetadata[] = [];

	/**
	 * Relations inside this embed.
	 */
	relations: RelationMetadata[] = [];

	/**
	 * Entity listeners inside this embed.
	 */
	listeners: EntityListenerMetadata[] = [];

	/**
	 * Indices applied to the embed columns.
	 */
	indices: IndexMetadata[] = [];

	/**
	 * Uniques applied to the embed columns.
	 */
	uniques: UniqueMetadata[] = [];

	/**
	 * Relation ids inside this embed.
	 */
	relationIds: RelationIdMetadata[] = [];

	/**
	 * Relation counts inside this embed.
	 */
	relationCounts: RelationCountMetadata[] = [];

	/**
	 * Nested embeddable in this embeddable (which has current embedded as parent embedded).
	 */
	embeddeds: EmbeddedMetadata[] = [];

	/**
	 * Indicates if the entity should be instantiated using the constructor
	 * or via allocating a new object via `Object.create()`.
	 */
	isAlwaysUsingConstructor: boolean = true;

	/**
	 * Indicates if this embedded is in array mode.
	 *
	 * This option works only in mongodb.
	 */
	isArray: boolean = false;

	/**
	 * Prefix of the embedded, used instead of propertyName.
	 * If set to empty string or false, then prefix is not set at all.
	 */
	customPrefix: string | boolean | undefined;

	/**
	 * Gets the prefix of the columns.
	 * By default its a property name of the class where this prefix is.
	 * But if custom prefix is set then it takes its value as a prefix.
	 * However if custom prefix is set to empty string or false, then prefix to column is not applied at all.
	 */
	prefix: string;

	/**
	 * Returns array of property names of current embed and all its parent embeds.
	 *
	 * example: post[data][information][counters].id where "data", "information" and "counters" are embeds
	 * we need to get value of "id" column from the post real entity object.
	 * this method will return ["data", "information", "counters"]
	 */
	parentPropertyNames: string[] = [];

	/**
	 * Returns array of prefixes of current embed and all its parent embeds.
	 */
	parentPrefixes: string[] = [];

	/**
	 * Returns embed metadatas from all levels of the parent tree.
	 *
	 * example: post[data][information][counters].id where "data", "information" and "counters" are embeds
	 * this method will return [embed metadata of data, embed metadata of information, embed metadata of counters]
	 */
	embeddedMetadataTree: EmbeddedMetadata[] = [];

	/**
	 * Embed metadatas from all levels of the parent tree.
	 *
	 * example: post[data][information][counters].id where "data", "information" and "counters" are embeds
	 * this method will return [embed metadata of data, embed metadata of information, embed metadata of counters]
	 */
	columnsFromTree: ColumnMetadata[] = [];

	/**
	 * Relations of this embed and all relations from its child embeds.
	 */
	relationsFromTree: RelationMetadata[] = [];

	/**
	 * Relations of this embed and all relations from its child embeds.
	 */
	listenersFromTree: EntityListenerMetadata[] = [];

	/**
	 * Indices of this embed and all indices from its child embeds.
	 */
	indicesFromTree: IndexMetadata[] = [];

	/**
	 * Uniques of this embed and all uniques from its child embeds.
	 */
	uniquesFromTree: UniqueMetadata[] = [];

	/**
	 * Relation ids of this embed and all relation ids from its child embeds.
	 */
	relationIdsFromTree: RelationIdMetadata[] = [];

	/**
	 * Relation counts of this embed and all relation counts from its child embeds.
	 */
	relationCountsFromTree: RelationCountMetadata[] = [];

	// ---------------------------------------------------------------------
	// Constructor
	// ---------------------------------------------------------------------

	constructor(options: {
		entityMetadata: EntityMetadata;
		args: EmbeddedMetadataArgs;
	}) {
		this.entityMetadata = options.entityMetadata;
		this.type = options.args.type();
		this.propertyName = options.args.propertyName;
		this.customPrefix = options.args.prefix;
		this.isArray = options.args.isArray;
	}

	// ---------------------------------------------------------------------
	// Public Methods
	// ---------------------------------------------------------------------

	/**
	 * Creates a new embedded object.
	 */
	create(options?: { fromDeserializer?: boolean }): any {
		if (!(typeof this.type === 'function')) {
			return {};
		}

		if (options?.fromDeserializer || !this.isAlwaysUsingConstructor) {
			return Object.create(this.type.prototype);
		} else {
			return new (this.type as any)();
		}
	}

	// ---------------------------------------------------------------------
	// Builder Methods
	// ---------------------------------------------------------------------

	build(connection: DataSource): this {
		this.embeddeds.forEach((embedded) => embedded.build(connection));
		this.prefix = this.buildPrefix(connection);
		this.parentPropertyNames = this.buildParentPropertyNames();
		this.parentPrefixes = this.buildParentPrefixes();
		this.propertyPath = this.parentPropertyNames.join('.');
		this.embeddedMetadataTree = this.buildEmbeddedMetadataTree();
		this.columnsFromTree = this.buildColumnsFromTree();
		this.relationsFromTree = this.buildRelationsFromTree();
		this.listenersFromTree = this.buildListenersFromTree();
		this.indicesFromTree = this.buildIndicesFromTree();
		this.uniquesFromTree = this.buildUniquesFromTree();
		this.relationIdsFromTree = this.buildRelationIdsFromTree();
		this.relationCountsFromTree = this.buildRelationCountsFromTree();

		if (connection.options.entitySkipConstructor) {
			this.isAlwaysUsingConstructor = !connection.options.entitySkipConstructor;
		}

		return this;
	}

	// ---------------------------------------------------------------------
	// Protected Methods
	// ---------------------------------------------------------------------

	protected buildPartialPrefix(): string[] {
		// if prefix option was not set or explicitly set to true - default prefix
		if (this.customPrefix === undefined || this.customPrefix === true) {
			return [this.propertyName];
		}

		// if prefix option was set to empty string or explicity set to false - disable prefix
		if (this.customPrefix === '' || this.customPrefix === false) {
			return [];
		}

		// use custom prefix
		if (typeof this.customPrefix === 'string') {
			return [this.customPrefix];
		}

		throw new TypeORMError(
			`Invalid prefix option given for ${this.entityMetadata.targetName}#${this.propertyName}`,
		);
	}

	protected buildPrefix(connection: DataSource): string {
		let prefixes: string[] = [];
		if (this.parentEmbeddedMetadata)
			prefixes.push(this.parentEmbeddedMetadata.buildPrefix(connection));

		prefixes.push(...this.buildPartialPrefix());

		return prefixes.join('_'); // todo: use naming strategy instead of "_"  !!!
	}

	protected buildParentPropertyNames(): string[] {
		return this.parentEmbeddedMetadata
			? this.parentEmbeddedMetadata.buildParentPropertyNames().concat(this.propertyName)
			: [this.propertyName];
	}

	protected buildParentPrefixes(): string[] {
		return this.parentEmbeddedMetadata
			? this.parentEmbeddedMetadata.buildParentPrefixes().concat(this.buildPartialPrefix())
			: this.buildPartialPrefix();
	}

	protected buildEmbeddedMetadataTree(): EmbeddedMetadata[] {
		return this.parentEmbeddedMetadata
			? this.parentEmbeddedMetadata.buildEmbeddedMetadataTree().concat(this)
			: [this];
	}

	protected buildColumnsFromTree(): ColumnMetadata[] {
		return this.embeddeds.reduce(
			(columns, embedded) => columns.concat(embedded.buildColumnsFromTree()),
			this.columns,
		);
	}

	protected buildRelationsFromTree(): RelationMetadata[] {
		return this.embeddeds.reduce(
			(relations, embedded) => relations.concat(embedded.buildRelationsFromTree()),
			this.relations,
		);
	}

	protected buildListenersFromTree(): EntityListenerMetadata[] {
		return this.embeddeds.reduce(
			(relations, embedded) => relations.concat(embedded.buildListenersFromTree()),
			this.listeners,
		);
	}

	protected buildIndicesFromTree(): IndexMetadata[] {
		return this.embeddeds.reduce(
			(relations, embedded) => relations.concat(embedded.buildIndicesFromTree()),
			this.indices,
		);
	}

	protected buildUniquesFromTree(): UniqueMetadata[] {
		return this.embeddeds.reduce(
			(relations, embedded) => relations.concat(embedded.buildUniquesFromTree()),
			this.uniques,
		);
	}

	protected buildRelationIdsFromTree(): RelationIdMetadata[] {
		return this.embeddeds.reduce(
			(relations, embedded) => relations.concat(embedded.buildRelationIdsFromTree()),
			this.relationIds,
		);
	}

	protected buildRelationCountsFromTree(): RelationCountMetadata[] {
		return this.embeddeds.reduce(
			(relations, embedded) => relations.concat(embedded.buildRelationCountsFromTree()),
			this.relationCounts,
		);
	}
}
