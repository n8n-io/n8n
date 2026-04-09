/**
 * Boot script for the sub-agent eval harness.
 *
 * 1. Preloads @mastra/core via plain CJS require() (avoids tsx ESM resolution bugs)
 * 2. Registers tsx for TypeScript transpilation
 * 3. Loads the actual CLI entry point
 */
require('./preload-mastra.cjs');
require('tsx/cjs');
require('./cli.ts');
