/**
 * Created by user on 2018/2/1/001.
 */
/// <reference types="node" />
import Promise from 'bluebird';
import xml2js from 'xml2js';
import { EPub as libEPub } from './lib/epub';
import { TocElement } from './lib/epub/const';
export { SYMBOL_RAW_DATA } from './lib/types';
export declare class EPub extends libEPub {
    static createAsync(epubfile: string, imagewebroot?: string, chapterwebroot?: string, ...argv: any[]): Promise<EPub>;
    protected _p_method_cb<T>(method: any, options?: Promise.FromNodeOptions, ...argv: any[]): Promise<T>;
    getChapterAsync(chapterId: string): Promise<string>;
    getChapterRawAsync(chapterId: string): Promise<string>;
    getFileAsync(id: string): Promise<[Buffer, string]>;
    getImageAsync(id: string): Promise<[Buffer, string]>;
    listImage(): TocElement[];
    static xml2jsOptions: xml2js.Options;
    /**
     * allow change Promise class
     * @type {PromiseConstructor}
     */
    static libPromise: typeof Promise;
}
export default EPub;
