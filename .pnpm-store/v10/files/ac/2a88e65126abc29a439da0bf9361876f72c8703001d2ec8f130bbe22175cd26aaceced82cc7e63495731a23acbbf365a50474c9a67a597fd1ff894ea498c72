"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = void 0;
const errors_1 = require("./errors");
const handle_1 = require("./errors/handle");
const flush_1 = require("./flush");
const main_1 = require("./main");
const settings_1 = require("./settings");
/**
 * Load and run oclif CLI
 *
 * @param options - options to load the CLI
 * @returns Promise<void>
 *
 * @example For ESM dev.js
 * ```
 * #!/usr/bin/env -S node --loader ts-node/esm --no-warnings=ExperimentalWarning
 * import { execute } from '@oclif/core'
 *
 * await execute({development: true, dir: import.meta.url})
 * ```
 *
 * @example For ESM run.js
 * ```
 * #!/usr/bin/env node
 * import { execute } from '@oclif/core'
 *
 * await execute({dir: import.meta.url})
 * ```
 *
 * @example For CJS dev.js
 * ```
 * #!/usr/bin/env ts-node
 * void (async () => {
 *   const oclif = await import('@oclif/core')
 *   await oclif.execute({development: true, dir: __dirname})
 * })()
 * ```
 *
 * @example For CJS run.js
 * ```
 * #!/usr/bin/env node
 * void (async () => {
 *   const oclif = await import('@oclif/core')
 *   await oclif.execute({dir: __dirname})
 * })()
 * ```
 */
async function execute(options) {
    if (!options.dir && !options.loadOptions) {
        throw new errors_1.CLIError('dir or loadOptions is required.');
    }
    if (options.development) {
        // In dev mode -> use ts-node and dev plugins
        process.env.NODE_ENV = 'development';
        settings_1.settings.debug = true;
    }
    return (0, main_1.run)(options.args ?? process.argv.slice(2), options.loadOptions ?? options.dir)
        .then(async (result) => {
        (0, flush_1.flush)();
        return result;
    })
        .catch(async (error) => (0, handle_1.handle)(error));
}
exports.execute = execute;
