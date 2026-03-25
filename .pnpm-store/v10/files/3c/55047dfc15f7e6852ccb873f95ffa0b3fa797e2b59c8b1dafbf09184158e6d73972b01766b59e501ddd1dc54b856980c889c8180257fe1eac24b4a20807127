import { ColumnMetadata } from "../metadata/ColumnMetadata";
import { UniqueMetadata } from "../metadata/UniqueMetadata";
import { ForeignKeyMetadata } from "../metadata/ForeignKeyMetadata";
import { RelationMetadata } from "../metadata/RelationMetadata";
import { JoinColumnMetadataArgs } from "../metadata-args/JoinColumnMetadataArgs";
import { DataSource } from "../data-source/DataSource";
/**
 * Builds join column for the many-to-one and one-to-one owner relations.
 *
 * Cases it should cover:
 * 1. when join column is set with custom name and without referenced column name
 * we need automatically set referenced column name - primary ids by default
 * @JoinColumn({ name: "custom_name" })
 *
 * 2. when join column is set with only referenced column name
 * we need automatically set join column name - relation name + referenced column name
 * @JoinColumn({ referencedColumnName: "title" })
 *
 * 3. when join column is set without both referenced column name and join column name
 * we need to automatically set both of them
 * @JoinColumn()
 *
 * 4. when join column is not set at all (as in case of @ManyToOne relation)
 * we need to create join column for it with proper referenced column name and join column name
 *
 * 5. when multiple join columns set none of referencedColumnName and name can be optional
 * both options are required
 * @JoinColumn([
 *      { name: "category_title", referencedColumnName: "type" },
 *      { name: "category_title", referencedColumnName: "name" },
 * ])
 *
 * Since for many-to-one relations having JoinColumn decorator is not required,
 * we need to go through each many-to-one relation without join column decorator set
 * and create join column metadata args for them.
 */
export declare class RelationJoinColumnBuilder {
    private connection;
    constructor(connection: DataSource);
    /**
     * Builds a foreign key of the many-to-one or one-to-one owner relations.
     */
    build(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata): {
        foreignKey: ForeignKeyMetadata | undefined;
        columns: ColumnMetadata[];
        uniqueConstraint: UniqueMetadata | undefined;
    };
    /**
     * Collects referenced columns from the given join column args.
     */
    protected collectReferencedColumns(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata): ColumnMetadata[];
    /**
     * Collects columns from the given join column args.
     */
    private collectColumns;
}
