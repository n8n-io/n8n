import { EntityMetadata } from "../metadata/EntityMetadata";
import { EmbeddedMetadata } from "../metadata/EmbeddedMetadata";
import { MetadataArgsStorage } from "../metadata-args/MetadataArgsStorage";
import { EmbeddedMetadataArgs } from "../metadata-args/EmbeddedMetadataArgs";
import { TableMetadataArgs } from "../metadata-args/TableMetadataArgs";
import { JunctionEntityMetadataBuilder } from "./JunctionEntityMetadataBuilder";
import { ClosureJunctionEntityMetadataBuilder } from "./ClosureJunctionEntityMetadataBuilder";
import { RelationJoinColumnBuilder } from "./RelationJoinColumnBuilder";
import { DataSource } from "../data-source/DataSource";
/**
 * Builds EntityMetadata objects and all its sub-metadatas.
 */
export declare class EntityMetadataBuilder {
    private connection;
    private metadataArgsStorage;
    /**
     * Used to build entity metadatas of the junction entities.
     */
    protected junctionEntityMetadataBuilder: JunctionEntityMetadataBuilder;
    /**
     * Used to build entity metadatas of the closure junction entities.
     */
    protected closureJunctionEntityMetadataBuilder: ClosureJunctionEntityMetadataBuilder;
    /**
     * Used to build join columns of the relations.
     */
    protected relationJoinColumnBuilder: RelationJoinColumnBuilder;
    constructor(connection: DataSource, metadataArgsStorage: MetadataArgsStorage);
    /**
     * Builds a complete entity metadatas for the given entity classes.
     */
    build(entityClasses?: Function[]): EntityMetadata[];
    /**
     * Creates entity metadata from the given table args.
     * Creates column, relation, etc. metadatas for everything this entity metadata owns.
     */
    protected createEntityMetadata(tableArgs: TableMetadataArgs): EntityMetadata;
    protected computeParentEntityMetadata(allEntityMetadatas: EntityMetadata[], entityMetadata: EntityMetadata): void;
    protected computeEntityMetadataStep1(allEntityMetadatas: EntityMetadata[], entityMetadata: EntityMetadata): void;
    /**
     * Creates from the given embedded metadata args real embedded metadatas with its columns and relations,
     * and does the same for all its sub-embeddeds (goes recursively).
     */
    protected createEmbeddedsRecursively(entityMetadata: EntityMetadata, embeddedArgs: EmbeddedMetadataArgs[]): EmbeddedMetadata[];
    /**
     * Computes all entity metadata's computed properties, and all its sub-metadatas (relations, columns, embeds, etc).
     */
    protected computeEntityMetadataStep2(entityMetadata: EntityMetadata): void;
    /**
     * Computes entity metadata's relations inverse side properties.
     */
    protected computeInverseProperties(entityMetadata: EntityMetadata, entityMetadatas: EntityMetadata[]): void;
    /**
     * Creates indices for the table of single table inheritance.
     */
    protected createKeysForTableInheritance(entityMetadata: EntityMetadata): void;
}
