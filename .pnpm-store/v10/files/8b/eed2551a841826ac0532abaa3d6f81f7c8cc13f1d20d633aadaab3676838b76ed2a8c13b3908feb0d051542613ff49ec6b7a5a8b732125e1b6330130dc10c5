import { RelationIdAttribute } from "./RelationIdAttribute";
import { DataSource } from "../../data-source/DataSource";
import { RelationIdLoadResult } from "./RelationIdLoadResult";
import { QueryRunner } from "../../query-runner/QueryRunner";
export declare class RelationIdLoader {
    protected connection: DataSource;
    protected queryRunner: QueryRunner | undefined;
    protected relationIdAttributes: RelationIdAttribute[];
    constructor(connection: DataSource, queryRunner: QueryRunner | undefined, relationIdAttributes: RelationIdAttribute[]);
    load(rawEntities: any[]): Promise<RelationIdLoadResult[]>;
}
