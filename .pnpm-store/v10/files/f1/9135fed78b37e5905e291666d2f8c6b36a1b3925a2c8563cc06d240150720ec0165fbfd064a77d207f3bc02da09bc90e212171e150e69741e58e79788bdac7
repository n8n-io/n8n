import express from 'express';
import cors from 'cors';
import { allowedMethods } from '../middleware/allowedMethods.js';
export function metadataHandler(metadata) {
    // Nested router so we can configure middleware and restrict HTTP method
    const router = express.Router();
    // Configure CORS to allow any origin, to make accessible to web-based MCP clients
    router.use(cors());
    router.use(allowedMethods(['GET', 'OPTIONS']));
    router.get('/', (req, res) => {
        res.status(200).json(metadata);
    });
    return router;
}
//# sourceMappingURL=metadata.js.map