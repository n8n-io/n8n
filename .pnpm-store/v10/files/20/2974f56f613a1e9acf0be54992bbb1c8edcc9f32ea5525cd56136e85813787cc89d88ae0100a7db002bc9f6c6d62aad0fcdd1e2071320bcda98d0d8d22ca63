import { Command } from '../command';
import { ArgInput } from '../interfaces/parser';
/**
 * Ensure that the provided args are an object. This is for backwards compatibility with v1 commands which
 * defined args as an array.
 *
 * @param args Either an array of args or an object of args
 * @returns ArgInput
 */
export declare function ensureArgObject(args?: {
    [name: string]: Command.Arg.Cached;
} | ArgInput | any[]): ArgInput;
