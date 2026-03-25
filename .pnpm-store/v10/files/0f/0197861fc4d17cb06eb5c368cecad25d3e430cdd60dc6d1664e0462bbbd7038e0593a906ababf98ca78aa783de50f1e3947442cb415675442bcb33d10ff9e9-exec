#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const __1 = require("..");
const { version } = require('../../package.json');
commander_1.program
    .name('tsc-alias')
    .version(version)
    .option('-p, --project <file>', 'path to tsconfig.json')
    .option('-w, --watch', 'Observe file changes')
    .option('--outDir, --dir <dir>', 'Run in a folder leaving the "outDir" of the tsconfig.json (relative path to tsconfig)')
    .option('-f, --resolve-full-paths', 'Attempt to fully resolve import paths if the corresponding .js file can be found')
    .addOption(new commander_1.Option('-fe, --resolve-full-extension [ext]', 'Specify the extension of incomplete import paths, works with resolveFullPaths')
    .choices(['.js', '.mjs', '.cjs'])
    .default('.js'))
    .option('-s, --silent', 'Reduced terminal output (default: true) [deprecated]')
    .option('-v, --verbose', 'Additional information is send to the terminal')
    .option('--debug', 'Debug information is send to the terminal')
    .option('-r, --replacer <replacers...>', 'path to optional extra replacer')
    .option('--inputglob <glob>', 'Overwrite glob used for file scanning')
    .option('--outputcheck <extensions...>', 'Overwrite file extensions used for path resolution')
    .parseAsync(process.argv);
const options = commander_1.program.opts();
(0, __1.replaceTscAliasPaths)({
    resolveFullExtension: options.resolveFullExtension,
    configFile: options.project,
    watch: !!options.watch,
    outDir: options.dir,
    verbose: !!options.verbose,
    debug: !!options.debug,
    resolveFullPaths: !!options.resolveFullPaths,
    replacers: options.replacer,
    fileExtensions: {
        inputGlob: options.inputglob,
        outputCheck: options.outputcheck
    }
});
//# sourceMappingURL=index.js.map