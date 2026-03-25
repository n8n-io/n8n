import { ClassTransformOptions } from './interfaces';
import { ClassConstructor } from './interfaces';
export declare class ClassTransformer {
    /**
     * Converts class (constructor) object to plain (literal) object. Also works with arrays.
     */
    instanceToPlain<T extends Record<string, any>>(object: T, options?: ClassTransformOptions): Record<string, any>;
    instanceToPlain<T extends Record<string, any>>(object: T[], options?: ClassTransformOptions): Record<string, any>[];
    /**
     * Converts class (constructor) object to plain (literal) object.
     * Uses given plain object as source object (it means fills given plain object with data from class object).
     * Also works with arrays.
     */
    classToPlainFromExist<T extends Record<string, any>, P>(object: T, plainObject: P, options?: ClassTransformOptions): T;
    classToPlainFromExist<T extends Record<string, any>, P>(object: T, plainObjects: P[], options?: ClassTransformOptions): T[];
    /**
     * Converts plain (literal) object to class (constructor) object. Also works with arrays.
     */
    plainToInstance<T extends Record<string, any>, V extends Array<any>>(cls: ClassConstructor<T>, plain: V, options?: ClassTransformOptions): T[];
    plainToInstance<T extends Record<string, any>, V>(cls: ClassConstructor<T>, plain: V, options?: ClassTransformOptions): T;
    /**
     * Converts plain (literal) object to class (constructor) object.
     * Uses given object as source object (it means fills given object with data from plain object).
     * Also works with arrays.
     */
    plainToClassFromExist<T extends Record<string, any>, V extends Array<any>>(clsObject: T, plain: V, options?: ClassTransformOptions): T;
    plainToClassFromExist<T extends Record<string, any>, V>(clsObject: T, plain: V, options?: ClassTransformOptions): T[];
    /**
     * Converts class (constructor) object to new class (constructor) object. Also works with arrays.
     */
    instanceToInstance<T>(object: T, options?: ClassTransformOptions): T;
    instanceToInstance<T>(object: T[], options?: ClassTransformOptions): T[];
    /**
     * Converts class (constructor) object to plain (literal) object.
     * Uses given plain object as source object (it means fills given plain object with data from class object).
     * Also works with arrays.
     */
    classToClassFromExist<T>(object: T, fromObject: T, options?: ClassTransformOptions): T;
    classToClassFromExist<T>(object: T, fromObjects: T[], options?: ClassTransformOptions): T[];
    /**
     * Serializes given object to a JSON string.
     */
    serialize<T>(object: T, options?: ClassTransformOptions): string;
    serialize<T>(object: T[], options?: ClassTransformOptions): string;
    /**
     * Deserializes given JSON string to a object of the given class.
     */
    deserialize<T>(cls: ClassConstructor<T>, json: string, options?: ClassTransformOptions): T;
    /**
     * Deserializes given JSON string to an array of objects of the given class.
     */
    deserializeArray<T>(cls: ClassConstructor<T>, json: string, options?: ClassTransformOptions): T[];
}
