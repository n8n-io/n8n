import { RelationMetadataArgs } from "./RelationMetadataArgs";
import { ColumnMetadataArgs } from "./ColumnMetadataArgs";
import { RelationCountMetadataArgs } from "./RelationCountMetadataArgs";
import { IndexMetadataArgs } from "./IndexMetadataArgs";
import { EntityListenerMetadataArgs } from "./EntityListenerMetadataArgs";
import { TableMetadataArgs } from "./TableMetadataArgs";
import { NamingStrategyMetadataArgs } from "./NamingStrategyMetadataArgs";
import { JoinTableMetadataArgs } from "./JoinTableMetadataArgs";
import { JoinColumnMetadataArgs } from "./JoinColumnMetadataArgs";
import { EmbeddedMetadataArgs } from "./EmbeddedMetadataArgs";
import { EntitySubscriberMetadataArgs } from "./EntitySubscriberMetadataArgs";
import { RelationIdMetadataArgs } from "./RelationIdMetadataArgs";
import { InheritanceMetadataArgs } from "./InheritanceMetadataArgs";
import { DiscriminatorValueMetadataArgs } from "./DiscriminatorValueMetadataArgs";
import { EntityRepositoryMetadataArgs } from "./EntityRepositoryMetadataArgs";
import { TransactionEntityMetadataArgs } from "./TransactionEntityMetadataArgs";
import { TransactionRepositoryMetadataArgs } from "./TransactionRepositoryMetadataArgs";
import { GeneratedMetadataArgs } from "./GeneratedMetadataArgs";
import { TreeMetadataArgs } from "./TreeMetadataArgs";
import { UniqueMetadataArgs } from "./UniqueMetadataArgs";
import { CheckMetadataArgs } from "./CheckMetadataArgs";
import { ExclusionMetadataArgs } from "./ExclusionMetadataArgs";
/**
 * Storage all metadatas args of all available types: tables, columns, subscribers, relations, etc.
 * Each metadata args represents some specifications of what it represents.
 * MetadataArgs used to create a real Metadata objects.
 */
export declare class MetadataArgsStorage {
    readonly tables: TableMetadataArgs[];
    readonly trees: TreeMetadataArgs[];
    readonly entityRepositories: EntityRepositoryMetadataArgs[];
    readonly transactionEntityManagers: TransactionEntityMetadataArgs[];
    readonly transactionRepositories: TransactionRepositoryMetadataArgs[];
    readonly namingStrategies: NamingStrategyMetadataArgs[];
    readonly entitySubscribers: EntitySubscriberMetadataArgs[];
    readonly indices: IndexMetadataArgs[];
    readonly uniques: UniqueMetadataArgs[];
    readonly checks: CheckMetadataArgs[];
    readonly exclusions: ExclusionMetadataArgs[];
    readonly columns: ColumnMetadataArgs[];
    readonly generations: GeneratedMetadataArgs[];
    readonly relations: RelationMetadataArgs[];
    readonly joinColumns: JoinColumnMetadataArgs[];
    readonly joinTables: JoinTableMetadataArgs[];
    readonly entityListeners: EntityListenerMetadataArgs[];
    readonly relationCounts: RelationCountMetadataArgs[];
    readonly relationIds: RelationIdMetadataArgs[];
    readonly embeddeds: EmbeddedMetadataArgs[];
    readonly inheritances: InheritanceMetadataArgs[];
    readonly discriminatorValues: DiscriminatorValueMetadataArgs[];
    filterTables(target: Function | string): TableMetadataArgs[];
    filterTables(target: (Function | string)[]): TableMetadataArgs[];
    filterColumns(target: Function | string): ColumnMetadataArgs[];
    filterColumns(target: (Function | string)[]): ColumnMetadataArgs[];
    findGenerated(target: Function | string, propertyName: string): GeneratedMetadataArgs | undefined;
    findGenerated(target: (Function | string)[], propertyName: string): GeneratedMetadataArgs | undefined;
    findTree(target: (Function | string) | (Function | string)[]): TreeMetadataArgs | undefined;
    filterRelations(target: Function | string): RelationMetadataArgs[];
    filterRelations(target: (Function | string)[]): RelationMetadataArgs[];
    filterRelationIds(target: Function | string): RelationIdMetadataArgs[];
    filterRelationIds(target: (Function | string)[]): RelationIdMetadataArgs[];
    filterRelationCounts(target: Function | string): RelationCountMetadataArgs[];
    filterRelationCounts(target: (Function | string)[]): RelationCountMetadataArgs[];
    filterIndices(target: Function | string): IndexMetadataArgs[];
    filterIndices(target: (Function | string)[]): IndexMetadataArgs[];
    filterUniques(target: Function | string): UniqueMetadataArgs[];
    filterUniques(target: (Function | string)[]): UniqueMetadataArgs[];
    filterChecks(target: Function | string): CheckMetadataArgs[];
    filterChecks(target: (Function | string)[]): CheckMetadataArgs[];
    filterExclusions(target: Function | string): ExclusionMetadataArgs[];
    filterExclusions(target: (Function | string)[]): ExclusionMetadataArgs[];
    filterListeners(target: Function | string): EntityListenerMetadataArgs[];
    filterListeners(target: (Function | string)[]): EntityListenerMetadataArgs[];
    filterEmbeddeds(target: Function | string): EmbeddedMetadataArgs[];
    filterEmbeddeds(target: (Function | string)[]): EmbeddedMetadataArgs[];
    findJoinTable(target: Function | string, propertyName: string): JoinTableMetadataArgs | undefined;
    filterJoinColumns(target: Function | string, propertyName: string): JoinColumnMetadataArgs[];
    filterSubscribers(target: Function | string): EntitySubscriberMetadataArgs[];
    filterSubscribers(target: (Function | string)[]): EntitySubscriberMetadataArgs[];
    filterNamingStrategies(target: Function | string): NamingStrategyMetadataArgs[];
    filterNamingStrategies(target: (Function | string)[]): NamingStrategyMetadataArgs[];
    filterTransactionEntityManagers(target: Function | string, propertyName: string): TransactionEntityMetadataArgs[];
    filterTransactionRepository(target: Function | string, propertyName: string): TransactionRepositoryMetadataArgs[];
    filterSingleTableChildren(target: Function | string): TableMetadataArgs[];
    findInheritanceType(target: Function | string): InheritanceMetadataArgs | undefined;
    findDiscriminatorValue(target: Function | string): DiscriminatorValueMetadataArgs | undefined;
    /**
     * Filters given array by a given target or targets.
     */
    protected filterByTarget<T extends {
        target: Function | string;
    }>(array: T[], target: (Function | string) | (Function | string)[]): T[];
    /**
     * Filters given array by a given target or targets and prevents duplicate property names.
     */
    protected filterByTargetAndWithoutDuplicateProperties<T extends {
        target: Function | string;
        propertyName: string;
    }>(array: T[], target: (Function | string) | (Function | string)[]): T[];
    /**
     * Filters given array by a given target or targets and prevents duplicate relation property names.
     */
    protected filterByTargetAndWithoutDuplicateRelationProperties<T extends RelationMetadataArgs>(array: T[], target: (Function | string) | (Function | string)[]): T[];
    /**
     * Filters given array by a given target or targets and prevents duplicate embedded property names.
     */
    protected filterByTargetAndWithoutDuplicateEmbeddedProperties<T extends EmbeddedMetadataArgs>(array: T[], target: (Function | string) | (Function | string)[]): T[];
}
