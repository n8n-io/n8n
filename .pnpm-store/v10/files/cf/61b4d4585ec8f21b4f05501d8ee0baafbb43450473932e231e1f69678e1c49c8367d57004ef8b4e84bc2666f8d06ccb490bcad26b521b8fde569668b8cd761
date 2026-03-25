export declare function shallowEqual(objA: any, objB: any): boolean;
export declare function copyStaticProperties(base: object, target: object): void;
/**
 * Helper to set `prop` to `this` as non-enumerable (hidden prop)
 * @param target
 * @param prop
 * @param value
 */
export declare function setHiddenProp(target: object, prop: any, value: any): void;
export interface Mixins extends Record<string, any> {
    locks: number;
    methods: Array<Function>;
}
export declare function patch(target: object, methodName: string, mixinMethod: Function): void;
