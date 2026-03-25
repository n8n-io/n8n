import { DataSource } from "../../data-source/DataSource";
import { RelationCountAttribute } from "./RelationCountAttribute";
import { RelationCountLoadResult } from "./RelationCountLoadResult";
import { QueryRunner } from "../../query-runner/QueryRunner";
export declare class RelationCountLoader {
    protected connection: DataSource;
    protected queryRunner: QueryRunner | undefined;
    protected relationCountAttributes: RelationCountAttribute[];
    constructor(connection: DataSource, queryRunner: QueryRunner | undefined, relationCountAttributes: RelationCountAttribute[]);
    load(rawEntities: any[]): Promise<RelationCountLoadResult[]>;
}
