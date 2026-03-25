import type { InvokeMethod, InvokeMethodOptionalArgs } from "../client";
import type { GetOutputType } from "../command";
import type { DocumentType } from "../shapes";
/**
 * @public
 *
 * This type is intended as a type helper for generated clients.
 * When initializing client, cast it to this type by passing
 * the client constructor type as the type parameter.
 *
 * It will then recursively remove "undefined" as a union type from all
 * input and output shapes' members. Note, this does not affect
 * any member that is optional (?) such as outputs with no required members.
 *
 * @example
 * ```ts
 * const client = new Client({}) as AssertiveClient<Client>;
 * ```
 */
export type AssertiveClient<Client extends object> = NarrowClientIOTypes<Client>;
/**
 * @public
 *
 * This is similar to AssertiveClient but additionally changes all
 * output types to (recursive) Required<T> so as to bypass all output nullability guards.
 */
export type UncheckedClient<Client extends object> = UncheckedClientOutputTypes<Client>;
/**
 * @internal
 *
 * Excludes undefined recursively.
 */
export type NoUndefined<T> = T extends Function ? T : T extends DocumentType ? T : [T] extends [object] ? {
    [key in keyof T]: NoUndefined<T[key]>;
} : Exclude<T, undefined>;
/**
 * @internal
 *
 * Excludes undefined and optional recursively.
 */
export type RecursiveRequired<T> = T extends Function ? T : T extends DocumentType ? T : [T] extends [object] ? {
    [key in keyof T]-?: RecursiveRequired<T[key]>;
} : Exclude<T, undefined>;
/**
 * @internal
 *
 * Removes undefined from unions.
 */
type NarrowClientIOTypes<ClientType extends object> = {
    [key in keyof ClientType]: [ClientType[key]] extends [
        InvokeMethodOptionalArgs<infer FunctionInputTypes, infer FunctionOutputTypes>
    ] ? InvokeMethodOptionalArgs<NoUndefined<FunctionInputTypes>, NoUndefined<FunctionOutputTypes>> : [ClientType[key]] extends [InvokeMethod<infer FunctionInputTypes, infer FunctionOutputTypes>] ? InvokeMethod<NoUndefined<FunctionInputTypes>, NoUndefined<FunctionOutputTypes>> : ClientType[key];
} & {
    send<Command>(command: Command, options?: any): Promise<NoUndefined<GetOutputType<Command>>>;
};
/**
 * @internal
 *
 * Removes undefined from unions and adds yolo output types.
 */
type UncheckedClientOutputTypes<ClientType extends object> = {
    [key in keyof ClientType]: [ClientType[key]] extends [
        InvokeMethodOptionalArgs<infer FunctionInputTypes, infer FunctionOutputTypes>
    ] ? InvokeMethodOptionalArgs<NoUndefined<FunctionInputTypes>, RecursiveRequired<FunctionOutputTypes>> : [ClientType[key]] extends [InvokeMethod<infer FunctionInputTypes, infer FunctionOutputTypes>] ? InvokeMethod<NoUndefined<FunctionInputTypes>, RecursiveRequired<FunctionOutputTypes>> : ClientType[key];
} & {
    send<Command>(command: Command, options?: any): Promise<RecursiveRequired<NoUndefined<GetOutputType<Command>>>>;
};
export {};
