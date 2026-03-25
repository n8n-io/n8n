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
exports.buildUserAgent = void 0;
const environment_1 = require("./environment");
const packageInfo = __importStar(require("../version.json"));
const buildUserAgent = (config) => {
    // We always want to include the package name and version
    // along with the langauge name to help distinguish these
    // requests from those emitted by other clients
    const userAgentParts = [
        `${packageInfo.name} v${packageInfo.version}`,
        'lang=typescript',
    ];
    if ((0, environment_1.isEdge)()) {
        userAgentParts.push('Edge Runtime');
    }
    // If available, capture information about the Node.js version
    if (typeof process !== 'undefined' && process && process.version) {
        userAgentParts.push(`node ${process.version}`);
    }
    if (config.sourceTag) {
        userAgentParts.push(`source_tag=${normalizeSourceTag(config.sourceTag)}`);
    }
    return userAgentParts.join('; ');
};
exports.buildUserAgent = buildUserAgent;
const normalizeSourceTag = (sourceTag) => {
    if (!sourceTag) {
        return;
    }
    /**
     * normalize sourceTag
     * 1. Lowercase
     * 2. Limit charset to [a-z0-9_ :]
     * 3. Trim left/right spaces
     * 4. Condense multiple spaces to one, and replace with underscore
     */
    return sourceTag
        .toLowerCase()
        .replace(/[^a-z0-9_ :]/g, '')
        .trim()
        .replace(/[ ]+/g, '_');
};
//# sourceMappingURL=user-agent.js.map