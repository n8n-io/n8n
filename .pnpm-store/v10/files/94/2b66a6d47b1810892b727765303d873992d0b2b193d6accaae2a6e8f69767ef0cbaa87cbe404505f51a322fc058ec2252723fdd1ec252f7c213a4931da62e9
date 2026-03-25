
export declare const assign: {
    <T extends {}, U>(target: T, source: U): T & U;
    <T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
    <T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
    (target: object, ...sources: any[]): any;
};

export declare interface BaseError {
    code: number;
}

export declare const create: (obj?: object | null) => object;

/**
 * Create a event emitter
 *
 * @returns An event emitter
 */
export declare function createEmitter<Events extends Record<EventType, unknown>>(): Emittable<Events>;

export declare function deepCopy(src: any, des: any): void;

/**
 * Event emitter interface
 */
export declare interface Emittable<Events extends Record<EventType, unknown> = {}> {
    /**
     * A map of event names of registered event handlers
     */
    events: EventHandlerMap<Events>;
    /**
     * Register an event handler with the event type
     *
     * @param event - An {@link EventType}
     * @param handler - An {@link EventHandler}, or a {@link WildcardEventHandler} if you are specified "*"
     */
    on<Key extends keyof Events>(event: Key | '*', handler: EventHandler<Events[keyof Events]> | WildcardEventHandler<Events>): void;
    /**
     * Unregister an event handler for the event type
     *
     * @param event - An {@link EventType}
     * @param handler - An {@link EventHandler}, or a {@link WildcardEventHandler} if you are specified "*"
     */
    off<Key extends keyof Events>(event: Key | '*', handler: EventHandler<Events[keyof Events]> | WildcardEventHandler<Events>): void;
    /**
     * Invoke all handlers with the event type
     *
     * @remarks
     * Note Manually firing "*" handlers should be not supported
     *
     * @param event - An {@link EventType}
     * @param payload - An event payload, optional
     */
    emit<Key extends keyof Events>(event: Key, payload?: Events[keyof Events]): void;
}

export declare function escapeHtml(rawText: string): string;

/**
 * Event handler
 */
export declare type EventHandler<T = unknown> = (payload?: T) => void;

/**
 * Event handler list
 */
export declare type EventHandlerList<T = unknown> = Array<EventHandler<T>>;

/**
 * Event handler map
 */
export declare type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<keyof Events | '*', EventHandlerList<Events[keyof Events]> | WildcardEventHandlerList<Events>>;

/**
 * Event type
 */
export declare type EventType = string | symbol;

export declare function format(message: string, ...args: any): string;

export declare const friendlyJSONstringify: (json: unknown) => string;

export declare function generateCodeFrame(source: string, start?: number, end?: number): string;

export declare const generateFormatCacheKey: (locale: string, key: string, source: string) => string;

export declare const getGlobalThis: () => any;

export declare function hasOwn(obj: object | Array<any>, key: string): boolean;

/**
 * Original Utilities
 * written by kazuya kawaguchi
 */
export declare const inBrowser: boolean;

/**
 * Useful Utilities By Evan you
 * Modified by kazuya kawaguchi
 * MIT License
 * https://github.com/vuejs/vue-next/blob/master/packages/shared/src/index.ts
 * https://github.com/vuejs/vue-next/blob/master/packages/shared/src/codeframe.ts
 */
export declare const isArray: (arg: any) => arg is any[];

export declare const isBoolean: (val: unknown) => val is boolean;

export declare const isDate: (val: unknown) => val is Date;

export declare const isEmptyObject: (val: unknown) => val is boolean;

export declare const isFunction: (val: unknown) => val is Function;

export declare const isNumber: (val: unknown) => val is number;

export declare const isObject: (val: unknown) => val is Record<any, any>;

export declare const isPlainObject: (val: unknown) => val is object;

export declare const isPromise: <T = any>(val: unknown) => val is Promise<T>;

export declare const isRegExp: (val: unknown) => val is RegExp;

export declare const isString: (val: unknown) => val is string;

export declare const isSymbol: (val: unknown) => val is symbol;

export declare function join(items: string[], separator?: string): string;

export declare const makeSymbol: (name: string, shareable?: boolean) => symbol;

export declare let mark: (tag: string) => void | undefined;

export declare let measure: (name: string, startTag: string, endTag: string) => void | undefined;

export declare const objectToString: () => string;

export declare function sanitizeTranslatedHtml(html: string): string;

export declare const toDisplayString: (val: unknown) => string;

export declare const toTypeString: (value: unknown) => string;

export declare function warn(msg: string, err?: Error): void;

export declare function warnOnce(msg: string): void;

/**
 * Wildcard event handler
 */
export declare type WildcardEventHandler<T = Record<string, unknown>> = (event: keyof T, payload?: T[keyof T]) => void;

/**
 * Wildcard event handler list
 */
export declare type WildcardEventHandlerList<T = Record<string, unknown>> = Array<WildcardEventHandler<T>>;

export { }
