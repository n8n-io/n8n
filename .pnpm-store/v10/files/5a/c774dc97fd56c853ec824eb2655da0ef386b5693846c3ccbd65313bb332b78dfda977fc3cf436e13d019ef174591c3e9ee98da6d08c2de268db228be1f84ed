export class PermanentUserData {
    /**
     * @param {Doc} doc
     * @param {YMap<any>} [storeType]
     */
    constructor(doc: Doc, storeType?: YMap<any> | undefined);
    yusers: YMap<any>;
    doc: Doc;
    /**
     * Maps from clientid to userDescription
     *
     * @type {Map<number,string>}
     */
    clients: Map<number, string>;
    dss: Map<string, DeleteSet>;
    /**
     * @param {Doc} doc
     * @param {number} clientid
     * @param {string} userDescription
     * @param {Object} conf
     * @param {function(Transaction, DeleteSet):boolean} [conf.filter]
     */
    setUserMapping(doc: Doc, clientid: number, userDescription: string, { filter }?: {
        filter?: ((arg0: Transaction, arg1: DeleteSet) => boolean) | undefined;
    }): void;
    /**
     * @param {number} clientid
     * @return {any}
     */
    getUserByClientId(clientid: number): any;
    /**
     * @param {ID} id
     * @return {string | null}
     */
    getUserByDeletedId(id: ID): string | null;
}
import { YMap } from "../types/YMap.js";
import { Doc } from "./Doc.js";
import { DeleteSet } from "./DeleteSet.js";
import { Transaction } from "./Transaction.js";
import { ID } from "./ID.js";
//# sourceMappingURL=PermanentUserData.d.ts.map