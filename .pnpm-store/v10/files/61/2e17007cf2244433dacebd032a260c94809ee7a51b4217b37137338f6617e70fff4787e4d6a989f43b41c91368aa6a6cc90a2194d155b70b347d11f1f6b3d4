import { RequestHandler } from 'express';
import { OAuthRegisteredClientsStore } from '../clients.js';
import { OAuthClientInformationFull } from '../../../shared/auth.js';
export type ClientAuthenticationMiddlewareOptions = {
    /**
     * A store used to read information about registered OAuth clients.
     */
    clientsStore: OAuthRegisteredClientsStore;
};
declare module 'express-serve-static-core' {
    interface Request {
        /**
         * The authenticated client for this request, if the `authenticateClient` middleware was used.
         */
        client?: OAuthClientInformationFull;
    }
}
export declare function authenticateClient({ clientsStore }: ClientAuthenticationMiddlewareOptions): RequestHandler;
//# sourceMappingURL=clientAuth.d.ts.map