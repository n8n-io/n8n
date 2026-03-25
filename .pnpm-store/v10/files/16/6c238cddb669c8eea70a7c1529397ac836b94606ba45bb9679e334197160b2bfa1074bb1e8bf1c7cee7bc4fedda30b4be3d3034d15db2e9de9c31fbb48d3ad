import { LoadOptions } from './interfaces';
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
export declare function execute(options: {
    args?: string[];
    development?: boolean;
    dir?: string;
    loadOptions?: LoadOptions;
}): Promise<unknown>;
