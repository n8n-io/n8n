"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientRegistrationHandler = clientRegistrationHandler;
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../../../shared/auth.js");
const node_crypto_1 = __importDefault(require("node:crypto"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = require("express-rate-limit");
const allowedMethods_js_1 = require("../middleware/allowedMethods.js");
const errors_js_1 = require("../errors.js");
const DEFAULT_CLIENT_SECRET_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
function clientRegistrationHandler({ clientsStore, clientSecretExpirySeconds = DEFAULT_CLIENT_SECRET_EXPIRY_SECONDS, rateLimit: rateLimitConfig, clientIdGeneration = true }) {
    if (!clientsStore.registerClient) {
        throw new Error('Client registration store does not support registering clients');
    }
    // Nested router so we can configure middleware and restrict HTTP method
    const router = express_1.default.Router();
    // Configure CORS to allow any origin, to make accessible to web-based MCP clients
    router.use((0, cors_1.default)());
    router.use((0, allowedMethods_js_1.allowedMethods)(['POST']));
    router.use(express_1.default.json());
    // Apply rate limiting unless explicitly disabled - stricter limits for registration
    if (rateLimitConfig !== false) {
        router.use((0, express_rate_limit_1.rateLimit)({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 20, // 20 requests per hour - stricter as registration is sensitive
            standardHeaders: true,
            legacyHeaders: false,
            message: new errors_js_1.TooManyRequestsError('You have exceeded the rate limit for client registration requests').toResponseObject(),
            ...rateLimitConfig
        }));
    }
    router.post('/', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        try {
            const parseResult = auth_js_1.OAuthClientMetadataSchema.safeParse(req.body);
            if (!parseResult.success) {
                throw new errors_js_1.InvalidClientMetadataError(parseResult.error.message);
            }
            const clientMetadata = parseResult.data;
            const isPublicClient = clientMetadata.token_endpoint_auth_method === 'none';
            // Generate client credentials
            const clientSecret = isPublicClient ? undefined : node_crypto_1.default.randomBytes(32).toString('hex');
            const clientIdIssuedAt = Math.floor(Date.now() / 1000);
            // Calculate client secret expiry time
            const clientsDoExpire = clientSecretExpirySeconds > 0;
            const secretExpiryTime = clientsDoExpire ? clientIdIssuedAt + clientSecretExpirySeconds : 0;
            const clientSecretExpiresAt = isPublicClient ? undefined : secretExpiryTime;
            let clientInfo = {
                ...clientMetadata,
                client_secret: clientSecret,
                client_secret_expires_at: clientSecretExpiresAt
            };
            if (clientIdGeneration) {
                clientInfo.client_id = node_crypto_1.default.randomUUID();
                clientInfo.client_id_issued_at = clientIdIssuedAt;
            }
            clientInfo = await clientsStore.registerClient(clientInfo);
            res.status(201).json(clientInfo);
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
    });
    return router;
}
//# sourceMappingURL=register.js.map