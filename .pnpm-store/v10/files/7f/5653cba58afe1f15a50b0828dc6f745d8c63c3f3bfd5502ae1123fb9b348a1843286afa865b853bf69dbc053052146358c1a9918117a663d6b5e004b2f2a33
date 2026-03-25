"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEject = void 0;
const child_process_1 = require("child_process");
const platform_1 = require("../utils/platform");
const handleEject = async ({ argv }) => {
    process.stdout.write(`\nLaunching eject using NPX.\n\n`);
    const { npxExecutableName, sanitize, shell } = (0, platform_1.getPlatformSpawnArgs)();
    const path = sanitize(argv.path, platform_1.sanitizePath);
    const projectDir = sanitize(argv['project-dir'], platform_1.sanitizePath);
    const child = (0, child_process_1.spawn)(npxExecutableName, [
        '-y',
        '@redocly/realm',
        'eject',
        `${argv.type}`,
        path,
        `-d=${projectDir}`,
        argv.force ? `--force=${argv.force}` : '',
    ], {
        stdio: 'inherit',
        shell,
    });
    child.on('error', (error) => {
        process.stderr.write(`Eject launch failed: ${error.message}`);
        throw new Error('Eject launch failed.');
    });
};
exports.handleEject = handleEject;
