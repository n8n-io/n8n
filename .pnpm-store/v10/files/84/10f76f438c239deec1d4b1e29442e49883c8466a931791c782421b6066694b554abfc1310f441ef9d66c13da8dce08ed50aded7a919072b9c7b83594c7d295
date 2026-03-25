import type { FrameworkOverridesIncomingSource, IFrameworkOverrides } from './interfaces/iFrameworkOverrides';
import { AgPromise } from './utils/promise';
/** The base frameworks, eg React & Angular, override this bean with implementations specific to their requirement. */
export declare class VanillaFrameworkOverrides implements IFrameworkOverrides {
    private frameworkName;
    readonly renderingEngine: 'vanilla' | 'react';
    readonly batchFrameworkComps: boolean;
    private baseDocLink;
    constructor(frameworkName?: 'javascript' | 'angular' | 'react' | 'vue');
    setInterval(action: any, timeout?: any): AgPromise<number>;
    addEventListener(element: HTMLElement, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    wrapIncoming: <T>(callback: () => T, source?: FrameworkOverridesIncomingSource) => T;
    wrapOutgoing: <T>(callback: () => T) => T;
    frameworkComponent(_: string): any;
    isFrameworkComponent(_: any): boolean;
    getDocLink(path?: string): string;
}
