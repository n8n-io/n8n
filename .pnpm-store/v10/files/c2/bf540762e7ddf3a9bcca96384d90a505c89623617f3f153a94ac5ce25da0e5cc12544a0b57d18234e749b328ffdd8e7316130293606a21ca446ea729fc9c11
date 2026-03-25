/**
 * Docs: https://github.com/node-formidable/formidable/blob/master/src/Formidable.js#L45
 */

import { IncomingMessage } from "http";
import { EventEmitter } from "stream";
import { DefaultOptions, EmitData, EventData, Fields, File, Files, Options, Part, PluginFunction } from "./";

declare class IncomingForm extends EventEmitter {
    static readonly DEFAULT_OPTIONS: DefaultOptions;
    constructor(options?: Partial<Options>);

    /**
     * Parses an incoming Node.js request containing form data. If callback is provided, all fields
     * and files are collected and passed to the callback.
     *
     * @link https://github.com/node-formidable/formidable#parserequest-callback
     */
    parse<FieldKey extends string, FileKey extends string>(
        request: IncomingMessage,
    ): Promise<[Fields<FieldKey>, Files<FileKey>]>;
    parse<FieldKey extends string, FileKey extends string>(
        request: IncomingMessage,
        callback?: (err: any, fields: Fields<FieldKey>, files: Files<FileKey>) => void,
    ): void;

    once(eventName: "end", listener: () => void): this;
    once(eventName: "error", listener: (err: any) => void): this;

    on(eventName: "data", listener: (data: EventData) => void): this;
    on(eventName: "error", listener: (err: any) => void): this;
    on(eventName: "field", listener: (name: string, value: string) => void): this;
    on(eventName: "fileBegin" | "file", listener: (formName: string, file: File) => void): this;
    on(eventName: "progress", listener: (bytesReceived: number, bytesExpected: number) => void): this;
    on(eventName: string, listener: () => void): this;

    emit(eventName: "data", data: EmitData): boolean;

    /**
     * A method that allows you to extend the Formidable library. By default we include 4 plugins,
     * which essentially are adapters to plug the different built-in parsers.
     *
     * @link https://github.com/node-formidable/formidable#useplugin-plugin
     */
    use(plugin: PluginFunction): void;

    /**
     * If you want to use Formidable to only handle certain parts for you, you can do something
     * similar. Or see #387 for inspiration, you can for example validate the mime-type.
     *
     * @link https://github.com/node-formidable/formidable#formonpart
     */
    onPart(part: Part): void;

    _handlePart(part: Part): void;
}

export = IncomingForm;
