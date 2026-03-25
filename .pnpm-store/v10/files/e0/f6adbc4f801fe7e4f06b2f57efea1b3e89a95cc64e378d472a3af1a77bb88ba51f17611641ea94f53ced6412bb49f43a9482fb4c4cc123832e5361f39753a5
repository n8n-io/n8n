import { Context, Recogniser } from '.';
import { Match } from '../match';
export declare class UTF_16BE implements Recogniser {
    name(): string;
    match(det: Context): Match | null;
}
export declare class UTF_16LE implements Recogniser {
    name(): string;
    match(det: Context): Match | null;
}
interface WithGetChar {
    getChar(input: Uint8Array, index: number): number;
}
declare class UTF_32 implements Recogniser, WithGetChar {
    name(): string;
    getChar(_input: Uint8Array, _index: number): number;
    match(det: Context): Match | null;
}
export declare class UTF_32BE extends UTF_32 {
    name(): string;
    getChar(input: Uint8Array, index: number): number;
}
export declare class UTF_32LE extends UTF_32 {
    name(): string;
    getChar(input: Uint8Array, index: number): number;
}
export {};
