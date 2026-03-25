"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startContainer = void 0;
const common_1 = require("../../common");
const startContainer = async (container) => {
    try {
        await container.start();
    }
    catch (err) {
        common_1.log.error(`Failed to start container: ${err}`, { containerId: container.id });
        throw err;
    }
};
exports.startContainer = startContainer;
//# sourceMappingURL=start-container.js.map