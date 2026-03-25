import type { Source } from './resolve';
import type { OasRef } from './typings/openapi';
export declare function joinPointer(base: string, key: string | number): string;
export declare function isRef(node: unknown): node is OasRef;
export declare function isExternalValue(node: unknown): boolean;
export declare class Location {
    source: Source;
    pointer: string;
    constructor(source: Source, pointer: string);
    child(components: (string | number)[] | string | number): Location;
    key(): this & {
        reportOnKey: boolean;
    };
    get absolutePointer(): string;
}
export declare function unescapePointer(fragment: string): string;
export declare function escapePointer<T extends string | number>(fragment: T): T;
export declare function parseRef(ref: string): {
    uri: string | null;
    pointer: string[];
};
export declare function parsePointer(pointer: string): string[];
export declare function pointerBaseName(pointer: string): string;
export declare function refBaseName(ref: string): string;
export declare function isAbsoluteUrl(ref: string): boolean;
export declare function isMappingRef(mapping: string): boolean;
export declare function isAnchor(ref: string): boolean;
