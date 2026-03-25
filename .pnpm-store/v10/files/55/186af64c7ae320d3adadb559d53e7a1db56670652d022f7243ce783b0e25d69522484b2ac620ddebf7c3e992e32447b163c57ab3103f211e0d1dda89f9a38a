import { MixedList } from "../common/MixedList";
export declare class ObjectUtils {
    /**
     * Checks if given value is an object.
     * We cannot use instanceof because it has problems when running on different contexts.
     * And we don't simply use typeof because typeof null === "object".
     */
    static isObject(val: any): val is Object;
    /**
     * Checks if given value is an object.
     * We cannot use instanceof because it has problems when running on different contexts.
     * And we don't simply use typeof because typeof null === "object".
     */
    static isObjectWithName(val: any): val is Object & {
        name: string;
    };
    /**
     * Copy the values of all of the enumerable own properties from one or more source objects to a
     * target object.
     * @param target The target object to copy to.
     * @param source The source object from which to copy properties.
     */
    static assign<T, U>(target: T, source: U): void;
    /**
     * Copy the values of all of the enumerable own properties from one or more source objects to a
     * target object.
     * @param target The target object to copy to.
     * @param source1 The first source object from which to copy properties.
     * @param source2 The second source object from which to copy properties.
     */
    static assign<T, U, V>(target: T, source1: U, source2: V): void;
    /**
     * Copy the values of all of the enumerable own properties from one or more source objects to a
     * target object.
     * @param target The target object to copy to.
     * @param source1 The first source object from which to copy properties.
     * @param source2 The second source object from which to copy properties.
     * @param source3 The third source object from which to copy properties.
     */
    static assign<T, U, V, W>(target: T, source1: U, source2: V, source3: W): void;
    /**
     * Converts MixedList<T> to strictly an array of its T items.
     */
    static mixedListToArray<T>(list: MixedList<T>): T[];
}
