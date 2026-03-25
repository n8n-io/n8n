"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchFiles = matchFiles;
const core_1 = require("./core");
const path_1 = require("./path");
// KLUDGE: Don't assume one 'node_modules' links to another. More likely a single directory inside the node_modules is the symlink.
// ALso, don't assume that an `@foo` directory is linked. More likely the contents of that are linked.
// Reserved characters, forces escaping of any non-word (or digit), non-whitespace character.
// It may be inefficient (we could just match (/[-[\]{}()*+?.,\\^$|#\s]/g), but this is future
// proof.
const reservedCharacterPattern = /[^\w\s\/]/g;
const wildcardCharCodes = [42 /* CharacterCodes.asterisk */, 63 /* CharacterCodes.question */];
const commonPackageFolders = ["node_modules", "bower_components", "jspm_packages"];
const implicitExcludePathRegexPattern = `(?!(${commonPackageFolders.join("|")})(/|$))`;
const filesMatcher = {
    /**
     * Matches any single directory segment unless it is the last segment and a .min.js file
     * Breakdown:
     *  [^./]                   # matches everything up to the first . character (excluding directory separators)
     *  (\\.(?!min\\.js$))?     # matches . characters but not if they are part of the .min.js file extension
     */
    singleAsteriskRegexFragment: "([^./]|(\\.(?!min\\.js$))?)*",
    /**
     * Regex for the ** wildcard. Matches any number of subdirectories. When used for including
     * files or directories, does not match subdirectories that start with a . character
     */
    doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
    replaceWildcardCharacter: match => replaceWildcardCharacter(match, filesMatcher.singleAsteriskRegexFragment)
};
const directoriesMatcher = {
    singleAsteriskRegexFragment: "[^/]*",
    /**
     * Regex for the ** wildcard. Matches any number of subdirectories. When used for including
     * files or directories, does not match subdirectories that start with a . character
     */
    doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
    replaceWildcardCharacter: match => replaceWildcardCharacter(match, directoriesMatcher.singleAsteriskRegexFragment)
};
const excludeMatcher = {
    singleAsteriskRegexFragment: "[^/]*",
    doubleAsteriskRegexFragment: "(/.+?)?",
    replaceWildcardCharacter: match => replaceWildcardCharacter(match, excludeMatcher.singleAsteriskRegexFragment)
};
const wildcardMatchers = {
    files: filesMatcher,
    directories: directoriesMatcher,
    exclude: excludeMatcher
};
function getRegularExpressionForWildcard(specs, basePath, usage) {
    const patterns = getRegularExpressionsForWildcards(specs, basePath, usage);
    if (!patterns || !patterns.length) {
        return undefined;
    }
    const pattern = patterns.map(pattern => `(${pattern})`).join("|");
    // If excluding, match "foo/bar/baz...", but if including, only allow "foo".
    const terminator = usage === "exclude" ? "($|/)" : "$";
    return `^(${pattern})${terminator}`;
}
function getRegularExpressionsForWildcards(specs, basePath, usage) {
    if (specs === undefined || specs.length === 0) {
        return undefined;
    }
    return (0, core_1.flatMap)(specs, spec => spec && getSubPatternFromSpec(spec, basePath, usage, wildcardMatchers[usage]));
}
/**
 * An "includes" path "foo" is implicitly a glob "foo/** /*" (without the space) if its last component has no extension,
 * and does not contain any glob characters itself.
 */
function isImplicitGlob(lastPathComponent) {
    return !/[.*?]/.test(lastPathComponent);
}
function getSubPatternFromSpec(spec, basePath, usage, { singleAsteriskRegexFragment, doubleAsteriskRegexFragment, replaceWildcardCharacter }) {
    let subpattern = "";
    let hasWrittenComponent = false;
    const components = (0, path_1.getNormalizedPathComponents)(spec, basePath);
    const lastComponent = (0, core_1.last)(components);
    if (usage !== "exclude" && lastComponent === "**") {
        return undefined;
    }
    // getNormalizedPathComponents includes the separator for the root component.
    // We need to remove to create our regex correctly.
    components[0] = (0, path_1.removeTrailingDirectorySeparator)(components[0]);
    if (isImplicitGlob(lastComponent)) {
        components.push("**", "*");
    }
    let optionalCount = 0;
    for (let component of components) {
        if (component === "**") {
            subpattern += doubleAsteriskRegexFragment;
        }
        else {
            if (usage === "directories") {
                subpattern += "(";
                optionalCount++;
            }
            if (hasWrittenComponent) {
                subpattern += path_1.directorySeparator;
            }
            if (usage !== "exclude") {
                let componentPattern = "";
                // The * and ? wildcards should not match directories or files that start with . if they
                // appear first in a component. Dotted directories and files can be included explicitly
                // like so: **/.*/.*
                if (component.charCodeAt(0) === 42 /* CharacterCodes.asterisk */) {
                    componentPattern += "([^./]" + singleAsteriskRegexFragment + ")?";
                    component = component.substr(1);
                }
                else if (component.charCodeAt(0) === 63 /* CharacterCodes.question */) {
                    componentPattern += "[^./]";
                    component = component.substr(1);
                }
                componentPattern += component.replace(reservedCharacterPattern, replaceWildcardCharacter);
                // Patterns should not include subfolders like node_modules unless they are
                // explicitly included as part of the path.
                //
                // As an optimization, if the component pattern is the same as the component,
                // then there definitely were no wildcard characters and we do not need to
                // add the exclusion pattern.
                if (componentPattern !== component) {
                    subpattern += implicitExcludePathRegexPattern;
                }
                subpattern += componentPattern;
            }
            else {
                subpattern += component.replace(reservedCharacterPattern, replaceWildcardCharacter);
            }
        }
        hasWrittenComponent = true;
    }
    while (optionalCount > 0) {
        subpattern += ")?";
        optionalCount--;
    }
    return subpattern;
}
function replaceWildcardCharacter(match, singleAsteriskRegexFragment) {
    return match === "*" ? singleAsteriskRegexFragment : match === "?" ? "[^/]" : "\\" + match;
}
/** @param path directory of the tsconfig.json */
function getFileMatcherPatterns(path, excludes, includes, useCaseSensitiveFileNames, currentDirectory) {
    path = (0, path_1.normalizePath)(path);
    currentDirectory = (0, path_1.normalizePath)(currentDirectory);
    const absolutePath = (0, path_1.combinePaths)(currentDirectory, path);
    return {
        includeFilePatterns: (0, core_1.map)(getRegularExpressionsForWildcards(includes, absolutePath, "files"), pattern => `^${pattern}$`),
        includeFilePattern: getRegularExpressionForWildcard(includes, absolutePath, "files"),
        includeDirectoryPattern: getRegularExpressionForWildcard(includes, absolutePath, "directories"),
        excludePattern: getRegularExpressionForWildcard(excludes, absolutePath, "exclude"),
        basePaths: getBasePaths(path, includes, useCaseSensitiveFileNames)
    };
}
function getRegexFromPattern(pattern, useCaseSensitiveFileNames) {
    return new RegExp(pattern, useCaseSensitiveFileNames ? "" : "i");
}
/** @param path directory of the tsconfig.json */
function matchFiles(path, extensions, excludes, includes, useCaseSensitiveFileNames, currentDirectory, depth, getFileSystemEntries, realpath) {
    path = (0, path_1.normalizePath)(path);
    currentDirectory = (0, path_1.normalizePath)(currentDirectory);
    const patterns = getFileMatcherPatterns(path, excludes, includes, useCaseSensitiveFileNames, currentDirectory);
    const includeFileRegexes = patterns.includeFilePatterns && patterns.includeFilePatterns.map(pattern => getRegexFromPattern(pattern, useCaseSensitiveFileNames));
    const includeDirectoryRegex = patterns.includeDirectoryPattern && getRegexFromPattern(patterns.includeDirectoryPattern, useCaseSensitiveFileNames);
    const excludeRegex = patterns.excludePattern && getRegexFromPattern(patterns.excludePattern, useCaseSensitiveFileNames);
    // Associate an array of results with each include regex. This keeps results in order of the "include" order.
    // If there are no "includes", then just put everything in results[0].
    const results = includeFileRegexes ? includeFileRegexes.map(() => []) : [[]];
    const visited = new Map();
    const toCanonical = (0, core_1.createGetCanonicalFileName)(useCaseSensitiveFileNames);
    for (const basePath of patterns.basePaths) {
        visitDirectory(basePath, (0, path_1.combinePaths)(currentDirectory, basePath), depth);
    }
    return (0, core_1.flatten)(results);
    function visitDirectory(path, absolutePath, depth) {
        const canonicalPath = toCanonical(realpath(absolutePath));
        if (visited.has(canonicalPath)) {
            return;
        }
        visited.set(canonicalPath, true);
        const { files, directories } = getFileSystemEntries(path);
        for (const current of (0, core_1.sort)(files, core_1.compareStringsCaseSensitive)) {
            const name = (0, path_1.combinePaths)(path, current);
            const absoluteName = (0, path_1.combinePaths)(absolutePath, current);
            if (extensions && !(0, path_1.fileExtensionIsOneOf)(name, extensions)) {
                continue;
            }
            if (excludeRegex && excludeRegex.test(absoluteName)) {
                continue;
            }
            if (!includeFileRegexes) {
                results[0].push(name);
            }
            else {
                const includeIndex = (0, core_1.findIndex)(includeFileRegexes, re => re.test(absoluteName));
                if (includeIndex !== -1) {
                    results[includeIndex].push(name);
                }
            }
        }
        if (depth !== undefined) {
            depth--;
            if (depth === 0) {
                return;
            }
        }
        for (const current of (0, core_1.sort)(directories, core_1.compareStringsCaseSensitive)) {
            const name = (0, path_1.combinePaths)(path, current);
            const absoluteName = (0, path_1.combinePaths)(absolutePath, current);
            if ((!includeDirectoryRegex || includeDirectoryRegex.test(absoluteName)) &&
                (!excludeRegex || !excludeRegex.test(absoluteName))) {
                visitDirectory(name, absoluteName, depth);
            }
        }
    }
}
/**
 * Computes the unique non-wildcard base paths amongst the provided include patterns.
 */
function getBasePaths(path, includes, useCaseSensitiveFileNames) {
    // Storage for our results in the form of literal paths (e.g. the paths as written by the user).
    const basePaths = [path];
    if (includes) {
        // Storage for literal base paths amongst the include patterns.
        const includeBasePaths = [];
        for (const include of includes) {
            // We also need to check the relative paths by converting them to absolute and normalizing
            // in case they escape the base path (e.g "..\somedirectory")
            const absolute = (0, path_1.isRootedDiskPath)(include) ? include : (0, path_1.normalizePath)((0, path_1.combinePaths)(path, include));
            // Append the literal and canonical candidate base paths.
            includeBasePaths.push(getIncludeBasePath(absolute));
        }
        // Sort the offsets array using either the literal or canonical path representations.
        includeBasePaths.sort((0, core_1.getStringComparer)(!useCaseSensitiveFileNames));
        // Iterate over each include base path and include unique base paths that are not a
        // subpath of an existing base path
        for (const includeBasePath of includeBasePaths) {
            if ((0, core_1.every)(basePaths, basePath => !(0, path_1.containsPath)(basePath, includeBasePath, path, !useCaseSensitiveFileNames))) {
                basePaths.push(includeBasePath);
            }
        }
    }
    return basePaths;
}
function getIncludeBasePath(absolute) {
    const wildcardOffset = (0, core_1.indexOfAnyCharCode)(absolute, wildcardCharCodes);
    if (wildcardOffset < 0) {
        // No "*" or "?" in the path
        return !(0, path_1.hasExtension)(absolute)
            ? absolute
            : (0, path_1.removeTrailingDirectorySeparator)((0, path_1.getDirectoryPath)(absolute));
    }
    return absolute.substring(0, absolute.lastIndexOf(path_1.directorySeparator, wildcardOffset));
}
//# sourceMappingURL=utilities.js.map