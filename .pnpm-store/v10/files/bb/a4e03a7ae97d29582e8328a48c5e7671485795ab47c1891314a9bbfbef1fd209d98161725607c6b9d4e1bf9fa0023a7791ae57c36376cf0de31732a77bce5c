import type { CoreMissingType } from '@intlify/core-base';
import type { Emittable } from '@intlify/shared';
import type { Locale } from '@intlify/core-base';
import type { MessageFunction } from '@intlify/core-base';
import type { Path } from '@intlify/core-base';
import type { PathValue } from '@intlify/core-base';
import type { ResourceNode } from '@intlify/core-base';

export declare type AdditionalPayloads = {
    meta?: Record<string, unknown>;
};

export declare type IntlifyDevToolsEmitter = Emittable<IntlifyDevToolsEmitterHooks>;

export declare type IntlifyDevToolsEmitterHooks = {
    'i18n:init': IntlifyDevToolsHookPayloads['i18n:init'];
    'function:translate': IntlifyDevToolsHookPayloads['function:translate'];
};

export declare type IntlifyDevToolsHookPayloads = {
    'i18n:init': {
        timestamp: number;
        i18n: unknown;
        version: string;
    } & AdditionalPayloads;
    'function:translate': {
        timestamp: number;
        message: string | number;
        key: string;
        locale: string;
        format?: string;
    } & AdditionalPayloads;
};

export declare type IntlifyDevToolsHooks = 'i18n:init' | 'function:translate';

export declare interface IntlifyRecord {
    id: number;
    i18n: unknown;
    version: string;
    types: Record<string, string | symbol>;
}

export declare type VueDevToolsEmitter = Emittable<VueDevToolsEmitterEvents>;

export declare type VueDevToolsEmitterEvents = {
    'compile-error': VueDevToolsTimelineEventPayloads['compile-error'];
    missing: VueDevToolsTimelineEventPayloads['missing'];
    fallback: VueDevToolsTimelineEventPayloads['fallback'];
    'message-resolve': VueDevToolsTimelineEventPayloads['message-resolve'];
    'message-compilation': VueDevToolsTimelineEventPayloads['message-compilation'];
    'message-evaluation': VueDevToolsTimelineEventPayloads['message-evaluation'];
};

export declare type VueDevToolsIDs = 'vue-devtools-plugin-vue-i18n' | 'vue-i18n-resource-inspector' | 'vue-i18n-timeline';

export declare type VueDevToolsTimelineEventPayloads = {
    'compile-error': {
        message: string;
        error: string;
        start?: number;
        end?: number;
        groupId?: string;
    };
    missing: {
        locale: Locale;
        key: Path;
        type: CoreMissingType;
        groupId?: string;
    };
    fallback: {
        key: Path;
        type: CoreMissingType;
        from?: Locale;
        to: Locale | 'global';
        groupId?: string;
    };
    'message-resolve': {
        type: 'message-resolve';
        key: Path;
        message: PathValue;
        time: number;
        groupId?: string;
    };
    'message-compilation': {
        type: 'message-compilation';
        message: string | ResourceNode | MessageFunction;
        time: number;
        groupId?: string;
    };
    'message-evaluation': {
        type: 'message-evaluation';
        value: unknown;
        time: number;
        groupId?: string;
    };
};

export declare type VueDevToolsTimelineEvents = 'compile-error' | 'missing' | 'fallback' | 'message-resolve' | 'message-compilation' | 'message-evaluation';

export { }
