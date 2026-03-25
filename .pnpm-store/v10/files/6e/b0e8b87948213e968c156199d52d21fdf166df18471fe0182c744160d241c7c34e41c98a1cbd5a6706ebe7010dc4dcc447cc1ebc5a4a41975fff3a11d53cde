import { OpenAPIFrameworkArgs, OpenAPIFrameworkInit, OpenAPIFrameworkVisitor } from './types';
export declare class OpenAPIFramework {
    private readonly args;
    private readonly loggingPrefix;
    constructor(args: OpenAPIFrameworkArgs);
    initialize(visitor: OpenAPIFrameworkVisitor): Promise<OpenAPIFrameworkInit>;
    private loadSpec;
    private sortApiDocTags;
    private getBasePathsFromServers;
}
