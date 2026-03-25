/**
 * Client info object which consists of:
 * uid: user id
 * utid: tenant id
 * xms_tdbr: optional, only for non-US tenants
 */
export type ClientInfo = {
    uid: string;
    utid: string;
    xms_tdbr?: string;
};
/**
 * Function to build a client info object from server clientInfo string
 * @param rawClientInfo
 * @param crypto
 */
export declare function buildClientInfo(rawClientInfo: string, base64Decode: (input: string) => string): ClientInfo;
/**
 * Function to build a client info object from cached homeAccountId string
 * @param homeAccountId
 */
export declare function buildClientInfoFromHomeAccountId(homeAccountId: string): ClientInfo;
//# sourceMappingURL=ClientInfo.d.ts.map