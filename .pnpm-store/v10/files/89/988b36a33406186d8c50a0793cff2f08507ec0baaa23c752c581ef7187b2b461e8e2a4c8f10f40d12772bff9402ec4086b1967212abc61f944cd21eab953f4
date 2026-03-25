"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revocationHandler = revocationHandler;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const clientAuth_js_1 = require("../middleware/clientAuth.js");
const auth_js_1 = require("../../../shared/auth.js");
const express_rate_limit_1 = require("express-rate-limit");
const allowedMethods_js_1 = require("../middleware/allowedMethods.js");
const errors_js_1 = require("../errors.js");
function revocationHandler({ provider, rateLimit: rateLimitConfig }) {
    if (!provider.revokeToken) {
        throw new Error('Auth provider does not support revoking tokens');
    }
    // Nested router so we can configure middleware and restrict HTTP method
    const router = express_1.default.Router();
    // Configure CORS to allow any origin, to make accessible to web-based MCP clients
    router.use((0, cors_1.default)());
    router.use((0, allowedMethods_js_1.allowedMethods)(['POST']));
    router.use(express_1.default.urlencoded({ extended: false }));
    // Apply rate limiting unless explicitly disabled
    if (rateLimitConfig !== false) {
        router.use((0, express_rate_limit_1.rateLimit)({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 50, // 50 requests per windowMs
            standardHeaders: true,
            legacyHeaders: false,
            message: new errors_js_1.TooManyRequestsError('You have exceeded the rate limit for token revocation requests').toResponseObject(),
            ...rateLimitConfig
        }));
    }
    // Authenticate and extract client details
    router.use((0, clientAuth_js_1.authenticateClient)({ clientsStore: provider.clientsStore }));
    router.post('/', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        try {
            const parseResult = auth_js_1.OAuthTokenRevocationRequestSchema.safeParse(req.body);
            if (!parseResult.success) {
                throw new errors_js_1.InvalidRequestError(parseResult.error.message);
            }
            const client = req.client;
            if (!client) {
                // This should never happen
                throw new errors_js_1.ServerError('Internal Server Error');
            }
            await provider.revokeToken(client, parseResult.data);
            res.status(200).json({});
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
//# sourceMappingURL=revoke.js.map