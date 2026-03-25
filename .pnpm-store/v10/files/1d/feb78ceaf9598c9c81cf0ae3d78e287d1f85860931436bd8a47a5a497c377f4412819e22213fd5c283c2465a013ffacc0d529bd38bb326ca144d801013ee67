/// <reference types="node"/>
import { EventEmitter } from "events";
import * as processors from "./lib/processors";

export function parseString(str: convertableToString, callback: (err: Error | null, result: any) => void): void;
export function parseString(
    str: convertableToString,
    options: ParserOptions,
    callback: (err: Error | null, result: any) => void,
): void;
export function parseStringPromise(str: convertableToString, options?: ParserOptions): Promise<any>;

export const defaults: {
    "0.1": Options;
    "0.2": OptionsV2;
};

export interface XmlDeclarationAttributes {
    version: string;
    encoding?: string | undefined;
    standalone?: boolean | undefined;
}

export interface RenderOptions {
    pretty?: boolean | undefined;
    indent?: string | undefined;
    newline?: string | undefined;
}

export class Builder {
    constructor(options?: BuilderOptions);
    buildObject(rootObj: any): string;
}

export class Parser extends EventEmitter {
    constructor(options?: ParserOptions);
    parseString(str: convertableToString, cb?: (error: Error | null, result: any) => void): void;
    parseStringPromise(str: convertableToString): Promise<any>;
    reset(): void;
}

export interface ParserOptions {
    attrkey?: string | undefined;
    charkey?: string | undefined;
    explicitCharkey?: boolean | undefined;
    trim?: boolean | undefined;
    normalizeTags?: boolean | undefined;
    normalize?: boolean | undefined;
    explicitRoot?: boolean | undefined;
    emptyTag?: (() => any) | string;
    explicitArray?: boolean | undefined;
    ignoreAttrs?: boolean | undefined;
    mergeAttrs?: boolean | undefined;
    validator?: Function | undefined;
    xmlns?: boolean | undefined;
    explicitChildren?: boolean | undefined;
    childkey?: string | undefined;
    preserveChildrenOrder?: boolean | undefined;
    charsAsChildren?: boolean | undefined;
    includeWhiteChars?: boolean | undefined;
    async?: boolean | undefined;
    strict?: boolean | undefined;
    attrNameProcessors?: Array<(name: string) => any> | undefined;
    attrValueProcessors?: Array<(value: string, name: string) => any> | undefined;
    tagNameProcessors?: Array<(name: string) => any> | undefined;
    valueProcessors?: Array<(value: string, name: string) => any> | undefined;
    chunkSize?: number | undefined;
}

export interface BuilderOptions {
    attrkey?: string | undefined;
    charkey?: string | undefined;
    rootName?: string | undefined;
    renderOpts?: RenderOptions | undefined;
    xmldec?: XmlDeclarationAttributes | undefined;
    doctype?: any;
    headless?: boolean | undefined;
    allowSurrogateChars?: boolean | undefined;
    cdata?: boolean | undefined;
}

export type Options = Omit<ParserOptions, "preserveChildrenOrder" | "chunkSize">;
export type OptionsV2 = ParserOptions & BuilderOptions;

export interface convertableToString {
    toString(): string;
}

export class ValidationError extends Error {
    constructor(message: string);
}

export { processors };
