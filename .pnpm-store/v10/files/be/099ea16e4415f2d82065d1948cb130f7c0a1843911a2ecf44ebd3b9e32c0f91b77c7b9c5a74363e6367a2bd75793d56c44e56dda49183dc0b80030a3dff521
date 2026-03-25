import { OpenAPIV3 } from './types';
interface ServerUrlVariables {
    [key: string]: ServerUrlValues;
}
interface ServerUrlValues {
    enum: string[];
    default?: string;
}
export declare class BasePath {
    readonly variables: ServerUrlVariables;
    readonly expressPath: string;
    private allPaths;
    constructor(server: OpenAPIV3.ServerObject);
    static fromServers(servers: OpenAPIV3.ServerObject[]): BasePath[];
    hasVariables(): boolean;
    all(): string[];
    private findUrlPath;
}
export {};
