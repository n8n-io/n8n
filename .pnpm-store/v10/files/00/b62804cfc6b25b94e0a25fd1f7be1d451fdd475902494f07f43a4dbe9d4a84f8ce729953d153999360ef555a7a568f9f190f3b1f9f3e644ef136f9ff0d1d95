import { AuthorizeResponse } from "@azure/msal-common/node";
import { ILoopbackClient } from "./ILoopbackClient.js";
export declare class LoopbackClient implements ILoopbackClient {
    private server;
    /**
     * Spins up a loopback server which returns the server response when the localhost redirectUri is hit
     * @param successTemplate
     * @param errorTemplate
     * @returns
     */
    listenForAuthCode(successTemplate?: string, errorTemplate?: string): Promise<AuthorizeResponse>;
    /**
     * Get the port that the loopback server is running on
     * @returns
     */
    getRedirectUri(): string;
    /**
     * Close the loopback server
     */
    closeServer(): void;
}
//# sourceMappingURL=LoopbackClient.d.ts.map