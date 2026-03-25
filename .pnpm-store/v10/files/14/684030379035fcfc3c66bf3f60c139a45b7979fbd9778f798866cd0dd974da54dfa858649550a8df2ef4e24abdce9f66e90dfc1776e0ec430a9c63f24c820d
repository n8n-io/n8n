import { DbVersionSupport } from '../utils/dbVersion.js';
import { ConsistencyLevel } from './replication.js';
export declare class ObjectsPath {
    private dbVersionSupport;
    constructor(dbVersionSupport: DbVersionSupport);
    buildCreate(consistencyLevel?: string): Promise<string>;
    buildDelete(id: string, className: string, consistencyLevel?: string, tenant?: string): Promise<string>;
    buildCheck(id: string, className: string, consistencyLevel?: ConsistencyLevel, tenant?: string): Promise<string>;
    buildGetOne(id: string, className: string, additional: string[], consistencyLevel?: ConsistencyLevel, nodeName?: string, tenant?: string): Promise<string>;
    buildGet(className?: string, limit?: number, additional?: string[], after?: string, tenant?: string): Promise<string>;
    buildUpdate(id: string, className: string, consistencyLevel?: string): Promise<string>;
    buildMerge(id: string, className: string, consistencyLevel?: string): Promise<string>;
    build(params: any, modifiers: any): Promise<string>;
    addClassNameDeprecatedNotSupportedCheck(params: any, path: string, support: any): string;
    addClassNameDeprecatedCheck(params: any, path: string, support: any): string;
    addId(params: any, path: string): string;
    addQueryParams(params: any, path: string): string;
    addQueryParamsForGet(params: any, path: string, support: any): string;
}
export declare class ReferencesPath {
    private dbVersionSupport;
    constructor(dbVersionSupport: DbVersionSupport);
    build(id: string, className: string, property: string, consistencyLevel?: ConsistencyLevel, tenant?: string): Promise<string>;
}
