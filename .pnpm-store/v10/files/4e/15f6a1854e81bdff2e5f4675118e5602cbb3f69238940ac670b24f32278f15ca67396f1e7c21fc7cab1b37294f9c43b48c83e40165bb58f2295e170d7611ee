"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadataHandler = metadataHandler;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const allowedMethods_js_1 = require("../middleware/allowedMethods.js");
function metadataHandler(metadata) {
    // Nested router so we can configure middleware and restrict HTTP method
    const router = express_1.default.Router();
    // Configure CORS to allow any origin, to make accessible to web-based MCP clients
    router.use((0, cors_1.default)());
    router.use((0, allowedMethods_js_1.allowedMethods)(['GET', 'OPTIONS']));
    router.get('/', (req, res) => {
        res.status(200).json(metadata);
    });
    return router;
}
//# sourceMappingURL=metadata.js.map