"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVersionGreaterOrEqual = isVersionGreaterOrEqual;
exports.parsePromptIdentifier = parsePromptIdentifier;
const semver_1 = require("semver");
function isVersionGreaterOrEqual(current_version, target_version) {
    const current = (0, semver_1.parse)(current_version);
    const target = (0, semver_1.parse)(target_version);
    if (!current || !target) {
        throw new Error("Invalid version format.");
    }
    return current.compare(target) >= 0;
}
function parsePromptIdentifier(identifier) {
    if (!identifier ||
        identifier.split("/").length > 2 ||
        identifier.startsWith("/") ||
        identifier.endsWith("/") ||
        identifier.split(":").length > 2) {
        throw new Error(`Invalid identifier format: ${identifier}`);
    }
    const [ownerNamePart, commitPart] = identifier.split(":");
    const commit = commitPart || "latest";
    if (ownerNamePart.includes("/")) {
        const [owner, name] = ownerNamePart.split("/", 2);
        if (!owner || !name) {
            throw new Error(`Invalid identifier format: ${identifier}`);
        }
        return [owner, name, commit];
    }
    else {
        if (!ownerNamePart) {
            throw new Error(`Invalid identifier format: ${identifier}`);
        }
        return ["-", ownerNamePart, commit];
    }
}
