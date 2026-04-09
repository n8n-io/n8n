import { parse as parseVersion } from "semver";
import { getInvalidPromptIdentifierMsg } from "./error.js";
export function isVersionGreaterOrEqual(current_version, target_version) {
    const current = parseVersion(current_version);
    const target = parseVersion(target_version);
    if (!current || !target) {
        throw new Error("Invalid version format.");
    }
    return current.compare(target) >= 0;
}
export function parsePromptIdentifier(identifier) {
    if (!identifier ||
        identifier.split("/").length > 2 ||
        identifier.startsWith("/") ||
        identifier.endsWith("/") ||
        identifier.split(":").length > 2) {
        throw new Error(getInvalidPromptIdentifierMsg(identifier));
    }
    const [ownerNamePart, commitPart] = identifier.split(":");
    const commit = commitPart || "latest";
    if (ownerNamePart.includes("/")) {
        const [owner, name] = ownerNamePart.split("/", 2);
        if (!owner || !name) {
            throw new Error(getInvalidPromptIdentifierMsg(identifier));
        }
        return [owner, name, commit];
    }
    else {
        if (!ownerNamePart) {
            throw new Error(getInvalidPromptIdentifierMsg(identifier));
        }
        return ["-", ownerNamePart, commit];
    }
}
