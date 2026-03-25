import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
export declare class Accesses extends ClientSDK {
    /**
     * List all of the access to this library.
     *
     * @remarks
     * Given a library, list all of the Entity that have access and to what level.
     */
    list(request: operations.LibrariesShareListV1Request, options?: RequestOptions): Promise<components.ListSharingOut>;
    /**
     * Create or update an access level.
     *
     * @remarks
     * Given a library id, you can create or update the access level of an entity. You have to be owner of the library to share a library. An owner cannot change their own role. A library cannot be shared outside of the organization.
     */
    updateOrCreate(request: operations.LibrariesShareCreateV1Request, options?: RequestOptions): Promise<components.SharingOut>;
    /**
     * Delete an access level.
     *
     * @remarks
     * Given a library id, you can delete the access level of an entity. An owner cannot delete it's own access. You have to be the owner of the library to delete an acces other than yours.
     */
    delete(request: operations.LibrariesShareDeleteV1Request, options?: RequestOptions): Promise<components.SharingOut>;
}
//# sourceMappingURL=accesses.d.ts.map