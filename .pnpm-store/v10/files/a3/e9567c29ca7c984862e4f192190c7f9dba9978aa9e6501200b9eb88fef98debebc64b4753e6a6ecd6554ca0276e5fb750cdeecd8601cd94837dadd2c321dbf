/// <reference types="node" />
import * as taskManager from './managers/tasks';
import { Options as OptionsInternal } from './settings';
import { Entry as EntryInternal, FileSystemAdapter as FileSystemAdapterInternal, Pattern as PatternInternal } from './types';
declare type EntryObjectModePredicate = {
    [TKey in keyof Pick<OptionsInternal, 'objectMode'>]-?: true;
};
declare type EntryStatsPredicate = {
    [TKey in keyof Pick<OptionsInternal, 'stats'>]-?: true;
};
declare type EntryObjectPredicate = EntryObjectModePredicate | EntryStatsPredicate;
declare function FastGlob(source: PatternInternal | PatternInternal[], options: OptionsInternal & EntryObjectPredicate): Promise<EntryInternal[]>;
declare function FastGlob(source: PatternInternal | PatternInternal[], options?: OptionsInternal): Promise<string[]>;
declare namespace FastGlob {
    type Options = OptionsInternal;
    type Entry = EntryInternal;
    type Task = taskManager.Task;
    type Pattern = PatternInternal;
    type FileSystemAdapter = FileSystemAdapterInternal;
    function sync(source: PatternInternal | PatternInternal[], options: OptionsInternal & EntryObjectPredicate): EntryInternal[];
    function sync(source: PatternInternal | PatternInternal[], options?: OptionsInternal): string[];
    function stream(source: PatternInternal | PatternInternal[], options?: OptionsInternal): NodeJS.ReadableStream;
    function generateTasks(source: PatternInternal | PatternInternal[], options?: OptionsInternal): Task[];
    function isDynamicPattern(source: PatternInternal, options?: OptionsInternal): boolean;
    function escapePath(source: PatternInternal): PatternInternal;
}
export = FastGlob;
