import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
import { Accesses } from "./accesses.js";
import { Documents } from "./documents.js";
export declare class Libraries extends ClientSDK {
    private _documents?;
    get documents(): Documents;
    private _accesses?;
    get accesses(): Accesses;
    /**
     * List all libraries you have access to.
     *
     * @remarks
     * List all libraries that you have created or have been shared with you.
     */
    list(options?: RequestOptions): Promise<components.ListLibraryOut>;
    /**
     * Create a new Library.
     *
     * @remarks
     * Create a new Library, you will be marked as the owner and only you will have the possibility to share it with others. When first created this will only be accessible by you.
     */
    create(request: components.LibraryIn, options?: RequestOptions): Promise<components.LibraryOut>;
    /**
     * Detailed information about a specific Library.
     *
     * @remarks
     * Given a library id, details information about that Library.
     */
    get(request: operations.LibrariesGetV1Request, options?: RequestOptions): Promise<components.LibraryOut>;
    /**
     * Delete a library and all of it's document.
     *
     * @remarks
     * Given a library id, deletes it together with all documents that have been uploaded to that library.
     */
    delete(request: operations.LibrariesDeleteV1Request, options?: RequestOptions): Promise<components.LibraryOut>;
    /**
     * Update a library.
     *
     * @remarks
     * Given a library id, you can update the name and description.
     */
    update(request: operations.LibrariesUpdateV1Request, options?: RequestOptions): Promise<components.LibraryOut>;
}
//# sourceMappingURL=libraries.d.ts.map