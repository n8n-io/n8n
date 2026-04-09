/**
 * Preload @mastra/core modules via plain CJS require() before tsx's
 * module resolution hook processes them. This avoids ERR_PACKAGE_PATH_NOT_EXPORTED
 * for ESM-only transitive deps (unicorn-magic via execa via npm-run-path).
 *
 * Usage: node -r ./evaluations/subagent/preload-mastra.cjs ...
 */
require('@mastra/core/agent');
require('@mastra/core/tools');
require('@mastra/core/mastra');
