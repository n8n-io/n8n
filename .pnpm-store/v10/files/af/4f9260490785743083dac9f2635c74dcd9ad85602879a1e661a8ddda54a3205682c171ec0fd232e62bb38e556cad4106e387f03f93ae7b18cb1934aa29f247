"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTranslations = void 0;
const child_process_1 = require("child_process");
const platform_1 = require("../utils/platform");
const handleTranslations = async ({ argv }) => {
    process.stdout.write(`\nLaunching translate using NPX.\n\n`);
    const { npxExecutableName, sanitize, shell } = (0, platform_1.getPlatformSpawnArgs)();
    const projectDir = sanitize(argv['project-dir'], platform_1.sanitizePath);
    const locale = sanitize(argv.locale, platform_1.sanitizeLocale);
    const child = (0, child_process_1.spawn)(npxExecutableName, ['-y', '@redocly/realm', 'translate', locale, `-d=${projectDir}`], {
        stdio: 'inherit',
        shell,
    });
    child.on('error', (error) => {
        process.stderr.write(`Translate launch failed: ${error.message}`);
        throw new Error(`Translate launch failed.`);
    });
};
exports.handleTranslations = handleTranslations;
