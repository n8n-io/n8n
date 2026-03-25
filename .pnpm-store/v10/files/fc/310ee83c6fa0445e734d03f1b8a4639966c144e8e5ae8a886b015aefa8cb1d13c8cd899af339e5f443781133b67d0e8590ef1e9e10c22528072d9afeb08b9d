import { RelationMetadata } from "../metadata/RelationMetadata";
import { DataSource } from "../data-source/DataSource";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { SelectQueryBuilder } from "./SelectQueryBuilder";
import { QueryRunner } from "../query-runner/QueryRunner";
/**
 * Loads relation ids for the given entities.
 */
export declare class RelationIdLoader {
    private connection;
    protected queryRunner?: QueryRunner | undefined;
    constructor(connection: DataSource, queryRunner?: QueryRunner | undefined);
    /**
     * Loads relation ids of the given entity or entities.
     */
    load(relation: RelationMetadata, entityOrEntities: ObjectLiteral | ObjectLiteral[], relatedEntityOrRelatedEntities?: ObjectLiteral | ObjectLiteral[]): Promise<any[]>;
    /**
     * Loads relation ids of the given entities and groups them into the object with parent and children.
     *
     * todo: extract this method?
     */
    loadManyToManyRelationIdsAndGroup<E1 extends ObjectLiteral, E2 extends ObjectLiteral>(relation: RelationMetadata, entitiesOrEntities: E1 | E1[], relatedEntityOrEntities?: E2 | E2[], queryBuilder?: SelectQueryBuilder<any>): Promise<{
        entity: E1;
        related?: E2 | E2[];
    }[]>;
    /**
     * Loads relation ids of the given entities and maps them into the given entity property.
     async loadManyToManyRelationIdsAndMap(
     relation: RelationMetadata,
     entityOrEntities: ObjectLiteral|ObjectLiteral[],
     mapToEntityOrEntities: ObjectLiteral|ObjectLiteral[],
     propertyName: string
     ): Promise<void> {
        const relationIds = await this.loadManyToManyRelationIds(relation, entityOrEntities, mapToEntityOrEntities);
        const mapToEntities = mapToEntityOrEntities instanceof Array ? mapToEntityOrEntities : [mapToEntityOrEntities];
        const junctionMetadata = relation.junctionEntityMetadata!;
        const mainAlias = junctionMetadata.name;
        const columns = relation.isOwning ? junctionMetadata.inverseColumns : junctionMetadata.ownerColumns;
        const inverseColumns = relation.isOwning ? junctionMetadata.ownerColumns : junctionMetadata.inverseColumns;
        mapToEntities.forEach(mapToEntity => {
            mapToEntity[propertyName] = [];
            relationIds.forEach(relationId => {
                const match = inverseColumns.every(column => {
                    return column.referencedColumn!.getEntityValue(mapToEntity) === relationId[mainAlias + "_" + column.propertyName];
                });
                if (match) {
                    if (columns.length === 1) {
                        mapToEntity[propertyName].push(relationId[mainAlias + "_" + columns[0].propertyName]);
                    } else {
                        const value = {};
                        columns.forEach(column => {
                            column.referencedColumn!.setEntityValue(value, relationId[mainAlias + "_" + column.propertyName]);
                        });
                        mapToEntity[propertyName].push(value);
                    }
                }
            });
        });
    }*/
    /**
     * Loads relation ids for the many-to-many relation.
     */
    protected loadForManyToMany(relation: RelationMetadata, entities: ObjectLiteral[], relatedEntities?: ObjectLiteral[]): Promise<any[]>;
    /**
     * Loads relation ids for the many-to-one and one-to-one owner relations.
     */
    protected loadForManyToOneAndOneToOneOwner(relation: RelationMetadata, entities: ObjectLiteral[], relatedEntities?: ObjectLiteral[]): Promise<any[]>;
    /**
     * Loads relation ids for the one-to-many and one-to-one not owner relations.
     */
    protected loadForOneToManyAndOneToOneNotOwner(relation: RelationMetadata, entities: ObjectLiteral[], relatedEntities?: ObjectLiteral[]): Promise<any[]>;
}
