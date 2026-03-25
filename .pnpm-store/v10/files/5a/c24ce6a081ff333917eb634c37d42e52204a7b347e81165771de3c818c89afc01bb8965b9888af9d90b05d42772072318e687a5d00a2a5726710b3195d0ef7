import { Range, Segment } from './types';
export * from './types';
export * from './track';
export * from './segment';
export declare function getLength(segments: Segment<any>[]): number;
export declare function toString<T extends Segment<any>>(segments: T[]): string;
export declare function replace<T extends Segment<any>>(segments: T[], pattern: string | RegExp, ...replacers: (T | ((match: string) => T))[]): void;
export declare function replaceAll<T extends Segment<any>>(segments: T[], pattern: RegExp, ...replacers: (T | ((match: string) => T))[]): void;
export declare function overwrite<T extends Segment<any>>(segments: T[], range: number | Range, ...inserts: T[]): void;
