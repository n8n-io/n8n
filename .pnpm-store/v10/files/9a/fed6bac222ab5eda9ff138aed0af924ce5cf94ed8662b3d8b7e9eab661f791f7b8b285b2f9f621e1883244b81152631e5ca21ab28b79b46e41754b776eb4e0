import type { FrameworkOverridesIncomingSource } from './agStack/interfaces/agFrameworkOverrides';
import type { IFrameworkOverrides } from './interfaces/iFrameworkOverrides';
/** The base frameworks, eg React & Angular, override this bean with implementations specific to their requirement. */
export declare class VanillaFrameworkOverrides implements IFrameworkOverrides {
    private readonly frameworkName;
    readonly renderingEngine: 'vanilla' | 'react';
    readonly batchFrameworkComps: boolean;
    private readonly baseDocLink;
    constructor(frameworkName?: 'javascript' | 'angular' | 'react' | 'vue');
    wrapIncoming: <T>(callback: () => T, source?: FrameworkOverridesIncomingSource) => T;
    wrapOutgoing: <T>(callback: () => T) => T;
    frameworkComponent(_: string): any;
    isFrameworkComponent(_: any): boolean;
    getDocLink(path?: string): string;
}
