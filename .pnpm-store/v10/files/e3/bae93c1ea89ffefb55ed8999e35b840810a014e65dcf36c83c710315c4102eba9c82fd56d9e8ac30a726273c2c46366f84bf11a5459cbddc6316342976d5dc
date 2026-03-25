"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateClient = authenticateClient;
const z = __importStar(require("zod/v4"));
const errors_js_1 = require("../errors.js");
const ClientAuthenticatedRequestSchema = z.object({
    client_id: z.string(),
    client_secret: z.string().optional()
});
function authenticateClient({ clientsStore }) {
    return async (req, res, next) => {
        try {
            const result = ClientAuthenticatedRequestSchema.safeParse(req.body);
            if (!result.success) {
                throw new errors_js_1.InvalidRequestError(String(result.error));
            }
            const { client_id, client_secret } = result.data;
            const client = await clientsStore.getClient(client_id);
            if (!client) {
                throw new errors_js_1.InvalidClientError('Invalid client_id');
            }
            if (client.client_secret) {
                if (!client_secret) {
                    throw new errors_js_1.InvalidClientError('Client secret is required');
                }
                if (client.client_secret !== client_secret) {
                    throw new errors_js_1.InvalidClientError('Invalid client_secret');
                }
                if (client.client_secret_expires_at && client.client_secret_expires_at < Math.floor(Date.now() / 1000)) {
                    throw new errors_js_1.InvalidClientError('Client secret has expired');
                }
            }
            req.client = client;
            next();
        }
        catch (error) {
            if (error instanceof errors_js_1.OAuthError) {
                const status = error instanceof errors_js_1.ServerError ? 500 : 400;
                res.status(status).json(error.toResponseObject());
            }
            else {
                const serverError = new errors_js_1.ServerError('Internal Server Error');
                res.status(500).json(serverError.toResponseObject());
            }
        }
    };
}
//# sourceMappingURL=clientAuth.js.map