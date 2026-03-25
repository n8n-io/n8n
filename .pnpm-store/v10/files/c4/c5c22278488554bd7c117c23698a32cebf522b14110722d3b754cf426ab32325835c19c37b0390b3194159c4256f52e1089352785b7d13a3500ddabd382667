import type { Context, DevtoolsPluginApi, Hookable } from './api/index.js';
import type { PluginDescriptor } from './plugin.js';
interface QueueItem {
    method: string;
    args: any[];
    resolve?: (value?: any) => void;
}
export declare class ApiProxy<TTarget extends DevtoolsPluginApi<any> = DevtoolsPluginApi<any>> {
    target: TTarget | null;
    targetQueue: QueueItem[];
    proxiedTarget: TTarget;
    onQueue: QueueItem[];
    proxiedOn: Hookable<Context>;
    plugin: PluginDescriptor;
    hook: any;
    fallbacks: Record<string, any>;
    constructor(plugin: PluginDescriptor, hook: any);
    setRealTarget(target: TTarget): Promise<void>;
}
export {};
