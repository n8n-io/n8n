"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheLatestVersion = exports.notifyUpdateCliVersion = exports.name = exports.version = void 0;
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
const semver_1 = require("semver");
const fetch_with_timeout_1 = require("./fetch-with-timeout");
const colorette_1 = require("colorette");
const miscellaneous_1 = require("./miscellaneous");
_a = require('../../package.json'), exports.version = _a.version, exports.name = _a.name;
const VERSION_CACHE_FILE = 'redocly-cli-version';
const SPACE_TO_BORDER = 4;
const INTERVAL_TO_CHECK = 1000 * 60 * 60 * 12;
const SHOULD_NOT_NOTIFY = process.env.NODE_ENV === 'test' ||
    process.env.CI ||
    !!process.env.LAMBDA_TASK_ROOT ||
    process.env.REDOCLY_SUPPRESS_UPDATE_NOTICE === 'true';
const notifyUpdateCliVersion = () => {
    if (SHOULD_NOT_NOTIFY) {
        return;
    }
    try {
        const latestVersion = (0, fs_1.readFileSync)((0, path_1.join)((0, os_1.tmpdir)(), VERSION_CACHE_FILE)).toString();
        if (isNewVersionAvailable(exports.version, latestVersion)) {
            renderUpdateBanner(exports.version, latestVersion);
        }
    }
    catch (e) {
        return;
    }
};
exports.notifyUpdateCliVersion = notifyUpdateCliVersion;
const isNewVersionAvailable = (current, latest) => (0, semver_1.compare)(current, latest) < 0;
const getLatestVersion = async (packageName) => {
    const latestUrl = `http://registry.npmjs.org/${packageName}/latest`;
    try {
        const response = await (0, fetch_with_timeout_1.default)(latestUrl, { timeout: fetch_with_timeout_1.DEFAULT_FETCH_TIMEOUT });
        const info = await response.json();
        return info.version;
    }
    catch {
        // Do nothing
        return;
    }
};
const cacheLatestVersion = () => {
    if (!isNeedToBeCached() || SHOULD_NOT_NOTIFY) {
        return;
    }
    getLatestVersion(exports.name)
        .then((version) => {
        if (version) {
            const lastCheckFile = (0, path_1.join)((0, os_1.tmpdir)(), VERSION_CACHE_FILE);
            (0, fs_1.writeFileSync)(lastCheckFile, version);
        }
    })
        .catch(() => { });
};
exports.cacheLatestVersion = cacheLatestVersion;
const renderUpdateBanner = (current, latest) => {
    const messageLines = [
        `A new version of ${(0, colorette_1.cyan)('Redocly CLI')} (${(0, colorette_1.green)(latest)}) is available.`,
        `Update now: \`${(0, colorette_1.cyan)('npm i -g @redocly/cli@latest')}\`.`,
        `Changelog: https://redocly.com/docs/cli/changelog/`,
    ];
    const maxLength = Math.max(...messageLines.map((line) => (0, miscellaneous_1.cleanColors)(line).length));
    const border = (0, colorette_1.yellow)('═'.repeat(maxLength + SPACE_TO_BORDER));
    const extraSpaces = ' '.repeat(SPACE_TO_BORDER);
    const banner = [
        '',
        extraSpaces + (0, colorette_1.yellow)('╔' + border + '╗'),
        extraSpaces + (0, colorette_1.yellow)('║' + ' '.repeat(maxLength + SPACE_TO_BORDER) + '║'),
        messageLines.map(getLineWithPadding(maxLength, extraSpaces)).join('\n'),
        extraSpaces + (0, colorette_1.yellow)('║' + ' '.repeat(maxLength + SPACE_TO_BORDER) + '║'),
        extraSpaces + (0, colorette_1.yellow)('╚' + border + '╝'),
        '',
        '',
    ].join('\n');
    process.stderr.write(banner);
};
const getLineWithPadding = (maxLength, extraSpaces) => (line) => {
    const padding = ' '.repeat(maxLength - (0, miscellaneous_1.cleanColors)(line).length);
    return `${extraSpaces}${(0, colorette_1.yellow)('║')}  ${line}${padding}  ${(0, colorette_1.yellow)('║')}`;
};
const isNeedToBeCached = () => {
    try {
        // Last version from npm is stored in a file in the OS temp folder
        const versionFile = (0, path_1.join)((0, os_1.tmpdir)(), VERSION_CACHE_FILE);
        if (!(0, fs_1.existsSync)(versionFile)) {
            return true;
        }
        const now = new Date().getTime();
        const stats = (0, fs_1.statSync)(versionFile);
        const lastCheck = stats.mtime.getTime();
        return now - lastCheck >= INTERVAL_TO_CHECK;
    }
    catch (e) {
        return false;
    }
};
