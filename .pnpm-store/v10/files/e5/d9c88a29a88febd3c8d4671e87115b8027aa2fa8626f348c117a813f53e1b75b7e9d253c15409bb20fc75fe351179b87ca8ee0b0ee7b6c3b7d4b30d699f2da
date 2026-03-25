"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.directorySeparator = void 0;
exports.isRootedDiskPath = isRootedDiskPath;
exports.hasExtension = hasExtension;
exports.fileExtensionIsOneOf = fileExtensionIsOneOf;
exports.getDirectoryPath = getDirectoryPath;
exports.combinePaths = combinePaths;
exports.getNormalizedPathComponents = getNormalizedPathComponents;
exports.normalizePath = normalizePath;
exports.removeTrailingDirectorySeparator = removeTrailingDirectorySeparator;
exports.containsPath = containsPath;
const core_1 = require("./core");
/**
 * Internally, we represent paths as strings with '/' as the directory separator.
 * When we make system calls (eg: LanguageServiceHost.getDirectory()),
 * we expect the host to correctly handle paths in our specified format.
 */
exports.directorySeparator = "/";
const altDirectorySeparator = "\\";
const urlSchemeSeparator = "://";
const backslashRegExp = /\\/g;
//// Path Tests
/**
 * Determines whether a charCode corresponds to `/` or `\`.
 */
function isAnyDirectorySeparator(charCode) {
    return charCode === 47 /* CharacterCodes.slash */ || charCode === 92 /* CharacterCodes.backslash */;
}
/**
 * Determines whether a path is an absolute disk path (e.g. starts with `/`, or a dos path
 * like `c:`, `c:\` or `c:/`).
 */
function isRootedDiskPath(path) {
    return getEncodedRootLength(path) > 0;
}
function hasExtension(fileName) {
    return (0, core_1.stringContains)(getBaseFileName(fileName), ".");
}
function fileExtensionIs(path, extension) {
    return path.length > extension.length && (0, core_1.endsWith)(path, extension);
}
function fileExtensionIsOneOf(path, extensions) {
    for (const extension of extensions) {
        if (fileExtensionIs(path, extension)) {
            return true;
        }
    }
    return false;
}
/**
 * Determines whether a path has a trailing separator (`/` or `\\`).
 */
function hasTrailingDirectorySeparator(path) {
    return path.length > 0 && isAnyDirectorySeparator(path.charCodeAt(path.length - 1));
}
//// Path Parsing
function isVolumeCharacter(charCode) {
    return (charCode >= 97 /* CharacterCodes.a */ && charCode <= 122 /* CharacterCodes.z */) ||
        (charCode >= 65 /* CharacterCodes.A */ && charCode <= 90 /* CharacterCodes.Z */);
}
function getFileUrlVolumeSeparatorEnd(url, start) {
    const ch0 = url.charCodeAt(start);
    if (ch0 === 58 /* CharacterCodes.colon */) {
        return start + 1;
    }
    if (ch0 === 37 /* CharacterCodes.percent */ && url.charCodeAt(start + 1) === 51 /* CharacterCodes._3 */) {
        const ch2 = url.charCodeAt(start + 2);
        if (ch2 === 97 /* CharacterCodes.a */ || ch2 === 65 /* CharacterCodes.A */) {
            return start + 3;
        }
    }
    return -1;
}
/**
 * Returns length of the root part of a path or URL (i.e. length of "/", "x:/", "//server/share/, file:///user/files").
 * If the root is part of a URL, the twos-complement of the root length is returned.
 */
function getEncodedRootLength(path) {
    if (!path) {
        return 0;
    }
    const ch0 = path.charCodeAt(0);
    // POSIX or UNC
    if (ch0 === 47 /* CharacterCodes.slash */ || ch0 === 92 /* CharacterCodes.backslash */) {
        if (path.charCodeAt(1) !== ch0) {
            return 1; // POSIX: "/" (or non-normalized "\")
        }
        const p1 = path.indexOf(ch0 === 47 /* CharacterCodes.slash */ ? exports.directorySeparator : altDirectorySeparator, 2);
        if (p1 < 0) {
            return path.length; // UNC: "//server" or "\\server"
        }
        return p1 + 1; // UNC: "//server/" or "\\server\"
    }
    // DOS
    if (isVolumeCharacter(ch0) && path.charCodeAt(1) === 58 /* CharacterCodes.colon */) {
        const ch2 = path.charCodeAt(2);
        if (ch2 === 47 /* CharacterCodes.slash */ || ch2 === 92 /* CharacterCodes.backslash */) {
            return 3; // DOS: "c:/" or "c:\"
        }
        if (path.length === 2) {
            return 2; // DOS: "c:" (but not "c:d")
        }
    }
    // URL
    const schemeEnd = path.indexOf(urlSchemeSeparator);
    if (schemeEnd !== -1) {
        const authorityStart = schemeEnd + urlSchemeSeparator.length;
        const authorityEnd = path.indexOf(exports.directorySeparator, authorityStart);
        if (authorityEnd !== -1) { // URL: "file:///", "file://server/", "file://server/path"
            // For local "file" URLs, include the leading DOS volume (if present).
            // Per https://www.ietf.org/rfc/rfc1738.txt, a host of "" or "localhost" is a
            // special case interpreted as "the machine from which the URL is being interpreted".
            const scheme = path.slice(0, schemeEnd);
            const authority = path.slice(authorityStart, authorityEnd);
            if (scheme === "file" && (authority === "" || authority === "localhost") &&
                isVolumeCharacter(path.charCodeAt(authorityEnd + 1))) {
                const volumeSeparatorEnd = getFileUrlVolumeSeparatorEnd(path, authorityEnd + 2);
                if (volumeSeparatorEnd !== -1) {
                    if (path.charCodeAt(volumeSeparatorEnd) === 47 /* CharacterCodes.slash */) {
                        // URL: "file:///c:/", "file://localhost/c:/", "file:///c%3a/", "file://localhost/c%3a/"
                        return ~(volumeSeparatorEnd + 1);
                    }
                    if (volumeSeparatorEnd === path.length) {
                        // URL: "file:///c:", "file://localhost/c:", "file:///c$3a", "file://localhost/c%3a"
                        // but not "file:///c:d" or "file:///c%3ad"
                        return ~volumeSeparatorEnd;
                    }
                }
            }
            return ~(authorityEnd + 1); // URL: "file://server/", "http://server/"
        }
        return ~path.length; // URL: "file://server", "http://server"
    }
    // relative
    return 0;
}
/**
 * Returns length of the root part of a path or URL (i.e. length of "/", "x:/", "//server/share/, file:///user/files").
 *
 * For example:
 * ```ts
 * getRootLength("a") === 0                   // ""
 * getRootLength("/") === 1                   // "/"
 * getRootLength("c:") === 2                  // "c:"
 * getRootLength("c:d") === 0                 // ""
 * getRootLength("c:/") === 3                 // "c:/"
 * getRootLength("c:\\") === 3                // "c:\\"
 * getRootLength("//server") === 7            // "//server"
 * getRootLength("//server/share") === 8      // "//server/"
 * getRootLength("\\\\server") === 7          // "\\\\server"
 * getRootLength("\\\\server\\share") === 8   // "\\\\server\\"
 * getRootLength("file:///path") === 8        // "file:///"
 * getRootLength("file:///c:") === 10         // "file:///c:"
 * getRootLength("file:///c:d") === 8         // "file:///"
 * getRootLength("file:///c:/path") === 11    // "file:///c:/"
 * getRootLength("file://server") === 13      // "file://server"
 * getRootLength("file://server/path") === 14 // "file://server/"
 * getRootLength("http://server") === 13      // "http://server"
 * getRootLength("http://server/path") === 14 // "http://server/"
 * ```
 */
function getRootLength(path) {
    const rootLength = getEncodedRootLength(path);
    return rootLength < 0 ? ~rootLength : rootLength;
}
function getDirectoryPath(path) {
    path = normalizeSlashes(path);
    // If the path provided is itself the root, then return it.
    const rootLength = getRootLength(path);
    if (rootLength === path.length) {
        return path;
    }
    // return the leading portion of the path up to the last (non-terminal) directory separator
    // but not including any trailing directory separator.
    path = removeTrailingDirectorySeparator(path);
    return path.slice(0, Math.max(rootLength, path.lastIndexOf(exports.directorySeparator)));
}
function getBaseFileName(path, extensions, ignoreCase) {
    path = normalizeSlashes(path);
    // if the path provided is itself the root, then it has not file name.
    const rootLength = getRootLength(path);
    if (rootLength === path.length) {
        return "";
    }
    // return the trailing portion of the path starting after the last (non-terminal) directory
    // separator but not including any trailing directory separator.
    path = removeTrailingDirectorySeparator(path);
    const name = path.slice(Math.max(getRootLength(path), path.lastIndexOf(exports.directorySeparator) + 1));
    const extension = extensions !== undefined && ignoreCase !== undefined ? getAnyExtensionFromPath(name, extensions, ignoreCase) : undefined;
    return extension ? name.slice(0, name.length - extension.length) : name;
}
function tryGetExtensionFromPath(path, extension, stringEqualityComparer) {
    if (!(0, core_1.startsWith)(extension, ".")) {
        extension = "." + extension;
    }
    if (path.length >= extension.length && path.charCodeAt(path.length - extension.length) === 46 /* CharacterCodes.dot */) {
        const pathExtension = path.slice(path.length - extension.length);
        if (stringEqualityComparer(pathExtension, extension)) {
            return pathExtension;
        }
    }
}
function getAnyExtensionFromPathWorker(path, extensions, stringEqualityComparer) {
    if (typeof extensions === "string") {
        return tryGetExtensionFromPath(path, extensions, stringEqualityComparer) || "";
    }
    for (const extension of extensions) {
        const result = tryGetExtensionFromPath(path, extension, stringEqualityComparer);
        if (result) {
            return result;
        }
    }
    return "";
}
function getAnyExtensionFromPath(path, extensions, ignoreCase) {
    // Retrieves any string from the final "." onwards from a base file name.
    // Unlike extensionFromPath, which throws an exception on unrecognized extensions.
    if (extensions) {
        return getAnyExtensionFromPathWorker(removeTrailingDirectorySeparator(path), extensions, ignoreCase ? core_1.equateStringsCaseInsensitive : core_1.equateStringsCaseSensitive);
    }
    const baseFileName = getBaseFileName(path);
    const extensionIndex = baseFileName.lastIndexOf(".");
    if (extensionIndex >= 0) {
        return baseFileName.substring(extensionIndex);
    }
    return "";
}
function pathComponents(path, rootLength) {
    const root = path.substring(0, rootLength);
    const rest = path.substring(rootLength).split(exports.directorySeparator);
    if (rest.length && !(0, core_1.lastOrUndefined)(rest)) {
        rest.pop();
    }
    return [root, ...rest];
}
/**
 * Parse a path into an array containing a root component (at index 0) and zero or more path
 * components (at indices > 0). The result is not normalized.
 * If the path is relative, the root component is `""`.
 * If the path is absolute, the root component includes the first path separator (`/`).
 *
 * ```ts
 * // POSIX
 * getPathComponents("/path/to/file.ext") === ["/", "path", "to", "file.ext"]
 * getPathComponents("/path/to/") === ["/", "path", "to"]
 * getPathComponents("/") === ["/"]
 * // DOS
 * getPathComponents("c:/path/to/file.ext") === ["c:/", "path", "to", "file.ext"]
 * getPathComponents("c:/path/to/") === ["c:/", "path", "to"]
 * getPathComponents("c:/") === ["c:/"]
 * getPathComponents("c:") === ["c:"]
 * // URL
 * getPathComponents("http://typescriptlang.org/path/to/file.ext") === ["http://typescriptlang.org/", "path", "to", "file.ext"]
 * getPathComponents("http://typescriptlang.org/path/to/") === ["http://typescriptlang.org/", "path", "to"]
 * getPathComponents("http://typescriptlang.org/") === ["http://typescriptlang.org/"]
 * getPathComponents("http://typescriptlang.org") === ["http://typescriptlang.org"]
 * getPathComponents("file://server/path/to/file.ext") === ["file://server/", "path", "to", "file.ext"]
 * getPathComponents("file://server/path/to/") === ["file://server/", "path", "to"]
 * getPathComponents("file://server/") === ["file://server/"]
 * getPathComponents("file://server") === ["file://server"]
 * getPathComponents("file:///path/to/file.ext") === ["file:///", "path", "to", "file.ext"]
 * getPathComponents("file:///path/to/") === ["file:///", "path", "to"]
 * getPathComponents("file:///") === ["file:///"]
 * getPathComponents("file://") === ["file://"]
 */
function getPathComponents(path, currentDirectory = "") {
    path = combinePaths(currentDirectory, path);
    return pathComponents(path, getRootLength(path));
}
//// Path Formatting
/**
 * Formats a parsed path consisting of a root component (at index 0) and zero or more path
 * segments (at indices > 0).
 *
 * ```ts
 * getPathFromPathComponents(["/", "path", "to", "file.ext"]) === "/path/to/file.ext"
 * ```
 */
function getPathFromPathComponents(pathComponents) {
    if (pathComponents.length === 0) {
        return "";
    }
    const root = pathComponents[0] && ensureTrailingDirectorySeparator(pathComponents[0]);
    return root + pathComponents.slice(1).join(exports.directorySeparator);
}
//// Path Normalization
/**
 * Normalize path separators, converting `\` into `/`.
 */
function normalizeSlashes(path) {
    return path.indexOf("\\") !== -1
        ? path.replace(backslashRegExp, exports.directorySeparator)
        : path;
}
/**
 * Reduce an array of path components to a more simplified path by navigating any
 * `"."` or `".."` entries in the path.
 */
function reducePathComponents(components) {
    if (!(0, core_1.some)(components)) {
        return [];
    }
    const reduced = [components[0]];
    for (let i = 1; i < components.length; i++) {
        const component = components[i];
        if (!component) {
            continue;
        }
        if (component === ".") {
            continue;
        }
        if (component === "..") {
            if (reduced.length > 1) {
                if (reduced[reduced.length - 1] !== "..") {
                    reduced.pop();
                    continue;
                }
            }
            else if (reduced[0]) {
                continue;
            }
        }
        reduced.push(component);
    }
    return reduced;
}
/**
 * Combines paths. If a path is absolute, it replaces any previous path. Relative paths are not simplified.
 *
 * ```ts
 * // Non-rooted
 * combinePaths("path", "to", "file.ext") === "path/to/file.ext"
 * combinePaths("path", "dir", "..", "to", "file.ext") === "path/dir/../to/file.ext"
 * // POSIX
 * combinePaths("/path", "to", "file.ext") === "/path/to/file.ext"
 * combinePaths("/path", "/to", "file.ext") === "/to/file.ext"
 * // DOS
 * combinePaths("c:/path", "to", "file.ext") === "c:/path/to/file.ext"
 * combinePaths("c:/path", "c:/to", "file.ext") === "c:/to/file.ext"
 * // URL
 * combinePaths("file:///path", "to", "file.ext") === "file:///path/to/file.ext"
 * combinePaths("file:///path", "file:///to", "file.ext") === "file:///to/file.ext"
 * ```
 */
function combinePaths(path, ...paths) {
    if (path) {
        path = normalizeSlashes(path);
    }
    for (let relativePath of paths) {
        if (!relativePath) {
            continue;
        }
        relativePath = normalizeSlashes(relativePath);
        if (!path || getRootLength(relativePath) !== 0) {
            path = relativePath;
        }
        else {
            path = ensureTrailingDirectorySeparator(path) + relativePath;
        }
    }
    return path;
}
/**
 * Parse a path into an array containing a root component (at index 0) and zero or more path
 * components (at indices > 0). The result is normalized.
 * If the path is relative, the root component is `""`.
 * If the path is absolute, the root component includes the first path separator (`/`).
 *
 * ```ts
 * getNormalizedPathComponents("to/dir/../file.ext", "/path/") === ["/", "path", "to", "file.ext"]
 * ```
 */
function getNormalizedPathComponents(path, currentDirectory) {
    return reducePathComponents(getPathComponents(path, currentDirectory));
}
function normalizePath(path) {
    path = normalizeSlashes(path);
    // Most paths don't require normalization
    if (!relativePathSegmentRegExp.test(path)) {
        return path;
    }
    // Some paths only require cleanup of `/./` or leading `./`
    const simplified = path.replace(/\/\.\//g, "/").replace(/^\.\//, "");
    if (simplified !== path) {
        path = simplified;
        if (!relativePathSegmentRegExp.test(path)) {
            return path;
        }
    }
    // Other paths require full normalization
    const normalized = getPathFromPathComponents(reducePathComponents(getPathComponents(path)));
    return normalized && hasTrailingDirectorySeparator(path) ? ensureTrailingDirectorySeparator(normalized) : normalized;
}
function removeTrailingDirectorySeparator(path) {
    if (hasTrailingDirectorySeparator(path)) {
        return path.substr(0, path.length - 1);
    }
    return path;
}
function ensureTrailingDirectorySeparator(path) {
    if (!hasTrailingDirectorySeparator(path)) {
        return path + exports.directorySeparator;
    }
    return path;
}
//// Path Comparisons
// check path for these segments: '', '.'. '..'
const relativePathSegmentRegExp = /(?:\/\/)|(?:^|\/)\.\.?(?:$|\/)/;
function containsPath(parent, child, currentDirectory, ignoreCase) {
    if (typeof currentDirectory === "string") {
        parent = combinePaths(currentDirectory, parent);
        child = combinePaths(currentDirectory, child);
    }
    else if (typeof currentDirectory === "boolean") {
        ignoreCase = currentDirectory;
    }
    if (parent === undefined || child === undefined) {
        return false;
    }
    if (parent === child) {
        return true;
    }
    const parentComponents = reducePathComponents(getPathComponents(parent));
    const childComponents = reducePathComponents(getPathComponents(child));
    if (childComponents.length < parentComponents.length) {
        return false;
    }
    const componentEqualityComparer = ignoreCase ? core_1.equateStringsCaseInsensitive : core_1.equateStringsCaseSensitive;
    for (let i = 0; i < parentComponents.length; i++) {
        const equalityComparer = i === 0 ? core_1.equateStringsCaseInsensitive : componentEqualityComparer;
        if (!equalityComparer(parentComponents[i], childComponents[i])) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=path.js.map