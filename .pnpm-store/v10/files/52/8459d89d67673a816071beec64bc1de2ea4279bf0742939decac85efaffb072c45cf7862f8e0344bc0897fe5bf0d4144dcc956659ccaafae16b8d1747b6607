/// <reference types="node" />
import { ArgumentType } from "./Command";
export declare const kExec: unique symbol;
export declare const kCallbacks: unique symbol;
export declare const notAllowedAutoPipelineCommands: string[];
export declare function shouldUseAutoPipelining(client: any, functionName: string, commandName: string): boolean;
export declare function getFirstValueInFlattenedArray(args: ArgumentType[]): string | Buffer | number | null | undefined;
export declare function executeWithAutoPipelining(client: any, functionName: string, commandName: string, args: ArgumentType[], callback: any): Promise<unknown>;
