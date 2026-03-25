import type { Warnings } from "../Warnings.js";
import { Word } from "../shell/Word.js";
import { SrcFormParam } from "../curl/opts.js";
export type Details = {
    contentType?: Word;
    filename?: Word;
    encoder?: Word;
    headers?: Word[];
    headerFiles?: Word[];
};
export type FormParamPrototype = {
    name: Word;
    content?: Word;
    contentFile?: Word;
} & Details;
export type FormParam = {
    name: Word;
} & ({
    content: Word;
} | {
    contentFile: Word;
}) & Details;
export type Supported = {
    filename?: boolean;
    encoder?: boolean;
    headers?: boolean;
};
export declare function parseForm(form: SrcFormParam[], warnings: Warnings): FormParam[];
