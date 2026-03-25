"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Runfiles = void 0;
const fs = require("fs");
const path = require("path");
const paths_1 = require("./paths");
const repository_1 = require("./repository");
/**
 * Class that provides methods for resolving Bazel runfiles.
 */
class Runfiles {
    constructor(_env = process.env) {
        this._env = _env;
        this._runfilesResolutionError = false;
        // If Bazel sets a variable pointing to a runfiles manifest,
        // we'll always use it.
        // Note that this has a slight performance implication on Mac/Linux
        // where we could use the runfiles tree already laid out on disk
        // but this just costs one file read for the external npm/node_modules
        // and one for each first-party module, not one per file.
        if (!!_env['RUNFILES_MANIFEST_FILE']) {
            this.manifest = this.loadRunfilesManifest(_env['RUNFILES_MANIFEST_FILE']);
        }
        else if (!!_env['RUNFILES_DIR']) {
            this.runfilesDir = path.resolve(_env['RUNFILES_DIR']);
            this.repoMappings = this.parseRepoMapping(this.runfilesDir);
        }
        else if (!!_env['RUNFILES']) {
            this.runfilesDir = path.resolve(_env['RUNFILES']);
            this.repoMappings = this.parseRepoMapping(this.runfilesDir);
        }
        else {
            this._runfilesResolutionError = true;
        }
        // Under --noenable_runfiles (in particular on Windows)
        // Bazel sets RUNFILES_MANIFEST_ONLY=1.
        // When this happens, we need to read the manifest file to locate
        // inputs
        if (_env['RUNFILES_MANIFEST_ONLY'] === '1' && !_env['RUNFILES_MANIFEST_FILE']) {
            console.warn(`Workaround https://github.com/bazelbuild/bazel/issues/7994
                 RUNFILES_MANIFEST_FILE should have been set but wasn't.
                 falling back to using runfiles symlinks.
                 If you want to test runfiles manifest behavior, add
                 --spawn_strategy=standalone to the command line.`);
        }
        // Bazel starts actions with pwd=execroot/my_wksp or pwd=runfiles/my_wksp
        this.workspace = _env['BAZEL_WORKSPACE'] || _env['JS_BINARY__WORKSPACE'] || undefined;
        // If target is from an external workspace such as @npm//rollup/bin:rollup
        // resolvePackageRelative is not supported since package is in an external
        // workspace.
        let target = _env['BAZEL_TARGET'] || _env['JS_BINARY__TARGET'];
        if (!!target && !target.startsWith('@')) {
            // //path/to:target -> path/to
            this.package = target.split(':')[0].replace(/^\/\//, '');
        }
    }
    _assertRunfilesResolved() {
        if (this._runfilesResolutionError) {
            throw new Error('Every node program run under Bazel must have a $RUNFILES_DIR, $RUNFILES or $RUNFILES_MANIFEST_FILE environment variable');
        }
    }
    /** Resolves the given path from the runfile manifest. */
    _resolveFromManifest(searchPath) {
        if (!this.manifest)
            return undefined;
        let result;
        for (const [k, v] of this.manifest) {
            // Account for Bazel --legacy_external_runfiles
            // which pollutes the workspace with 'my_wksp/external/...'
            if (k.startsWith(`${searchPath}/external`))
                continue;
            // If the manifest entry fully matches, return the value path without
            // considering other manifest entries. We already have an exact match.
            if (k === searchPath) {
                return v;
            }
            // Consider a case where `npm/node_modules` is resolved, and we have the following
            // manifest: `npm/node_modules/semver/LICENSE
            // /path/to/external/npm/node_modules/semver/LICENSE` To resolve the directory, we look for
            // entries that either fully match, or refer to contents within the directory we are looking
            // for. We can then subtract the child path to resolve the directory. e.g. in the case above
            // we subtract `length(`/semver/LICENSE`)` from the entry value.
            if (k.startsWith(`${searchPath}/`)) {
                const l = k.length - searchPath.length;
                const maybe = v.substring(0, v.length - l);
                if (maybe.match(paths_1.BAZEL_OUT_REGEX)) {
                    return maybe;
                }
                else {
                    result = maybe;
                }
            }
        }
        return result;
    }
    /**
     * The runfiles manifest maps from short_path
     * https://docs.bazel.build/versions/main/skylark/lib/File.html#short_path
     * to the actual location on disk where the file can be read.
     *
     * In a sandboxed execution, it does not exist. In that case, runfiles must be
     * resolved from a symlink tree under the runfiles dir.
     * See https://github.com/bazelbuild/bazel/issues/3726
     */
    loadRunfilesManifest(manifestPath) {
        const runfilesEntries = new Map();
        const input = fs.readFileSync(manifestPath, { encoding: 'utf-8' });
        for (const line of input.split('\n')) {
            if (!line)
                continue;
            const [runfilesPath, realPath] = line.split(' ');
            runfilesEntries.set(runfilesPath, realPath);
        }
        return runfilesEntries;
    }
    parseRepoMapping(runfilesDir) {
        var _a;
        const repoMappingPath = path.join(runfilesDir, paths_1.REPO_MAPPING_RLOCATION);
        if (!fs.existsSync(repoMappingPath)) {
            // The repo mapping manifest only exists with Bzlmod, so it's not an
            // error if it's missing. Since any repository name not contained in the
            // mapping is assumed to be already canonical, no map is equivalent to
            // not applying any mapping.
            return undefined;
        }
        const repoMappings = Object.create(null);
        const mappings = fs.readFileSync(repoMappingPath, { encoding: "utf-8" });
        // Each line of the repository mapping manifest has the form:
        // canonical name of source repo,apparent name of target repo,target repo runfiles directory
        // https://cs.opensource.google/bazel/bazel/+/1b073ac0a719a09c9b2d1a52680517ab22dc971e:src/main/java/com/google/devtools/build/lib/analysis/RepoMappingManifestAction.java;l=117
        for (const line of mappings.split("\n")) {
            if (!line)
                continue;
            const [sourceRepo, targetRepoApparentName, targetRepoDirectory] = line.split(",");
            ((_a = repoMappings[sourceRepo]) !== null && _a !== void 0 ? _a : (repoMappings[sourceRepo] = Object.create(null)))[targetRepoApparentName] = targetRepoDirectory;
        }
        return repoMappings;
    }
    /** Resolves the given module path. */
    resolve(modulePath, sourceRepo) {
        this._assertRunfilesResolved();
        // Normalize path by converting to forward slashes and removing all trailing
        // forward slashes
        modulePath = modulePath.replace(/\\/g, '/').replace(/\/+$/g, '');
        if (path.isAbsolute(modulePath)) {
            return modulePath;
        }
        if (this.repoMappings) {
            // Determine the repository which runfiles is being invoked from by default.
            if (sourceRepo === undefined) {
                sourceRepo = (0, repository_1.callerRepository)();
            }
            // If the repository mappings were loaded ensure the source repository is valid.
            if (!(sourceRepo in this.repoMappings)) {
                throw new Error(`source repository "${sourceRepo}" not found in repo mappings: ${JSON.stringify(this.repoMappings, null, 2)}`);
            }
        }
        const result = this._resolve(sourceRepo, modulePath, undefined);
        if (result) {
            return result;
        }
        const e = new Error(`could not resolve module "${modulePath}" from repository "${sourceRepo}"`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    /** Resolves the given path relative to the current Bazel workspace. */
    resolveWorkspaceRelative(modulePath) {
        // Normalize path by converting to forward slashes and removing all trailing
        // forward slashes
        modulePath = modulePath.replace(/\\/g, '/').replace(/\/+$/g, '');
        if (!this.workspace) {
            throw new Error('workspace could not be determined from the environment; make sure BAZEL_WORKSPACE is set');
        }
        return this.resolve(path.posix.join(this.workspace, modulePath));
    }
    /** Resolves the given path relative to the current Bazel package. */
    resolvePackageRelative(modulePath) {
        // Normalize path by converting to forward slashes and removing all trailing
        // forward slashes
        modulePath = modulePath.replace(/\\/g, '/').replace(/\/+$/g, '');
        if (!this.workspace) {
            throw new Error('workspace could not be determined from the environment; make sure BAZEL_WORKSPACE is set');
        }
        // NB: this.package may be '' if at the root of the workspace
        if (this.package === undefined) {
            throw new Error('package could not be determined from the environment; make sure BAZEL_TARGET is set');
        }
        return this.resolve(path.posix.join(this.workspace, this.package, modulePath));
    }
    /**
     * Patches the default Node.js resolution to support runfile resolution.
     * @deprecated Use the runfile helpers directly instead.
     **/
    patchRequire() {
        const requirePatch = this._env['BAZEL_NODE_PATCH_REQUIRE'];
        if (!requirePatch) {
            throw new Error('require patch location could not be determined from the environment');
        }
        require(requirePatch);
    }
    /** Helper for resolving a given module recursively in the runfiles. */
    _resolve(sourceRepo, moduleBase, moduleTail) {
        if (this.manifest) {
            const result = this._resolveFromManifest(moduleBase);
            if (result) {
                if (moduleTail) {
                    const maybe = path.join(result, moduleTail || '');
                    if (fs.existsSync(maybe)) {
                        return maybe;
                    }
                }
                else {
                    return result;
                }
            }
        }
        // Apply repo mappings to the moduleBase if it is a known repo.
        if (this.repoMappings && moduleBase in this.repoMappings[sourceRepo]) {
            const mappedRepo = this.repoMappings[sourceRepo][moduleBase];
            if (mappedRepo !== moduleBase) {
                const maybe = this._resolve(sourceRepo, mappedRepo, moduleTail);
                if (maybe !== undefined) {
                    return maybe;
                }
            }
        }
        if (this.runfilesDir) {
            const maybe = path.join(this.runfilesDir, moduleBase, moduleTail || '');
            if (fs.existsSync(maybe)) {
                return maybe;
            }
        }
        const dirname = path.dirname(moduleBase);
        if (dirname == '.') {
            // no match
            return undefined;
        }
        return this._resolve(sourceRepo, dirname, path.join(path.basename(moduleBase), moduleTail || ""));
    }
}
exports.Runfiles = Runfiles;
