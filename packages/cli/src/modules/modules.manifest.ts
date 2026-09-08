import type { PackagedModules } from '@n8n/backend-common';

/**
 * Backend modules that live in a workspace package (`packages/modules/<name>/backend`)
 * instead of `packages/cli/src/modules/<name>`.
 *
 * `ModuleRegistry.loadModules` reads this manifest first, and skips the
 * `dist/modules` filesystem route for every name listed here. Keep the
 * specifiers static so tsc compiles them, pnpm resolves them, and grep finds
 * them. Keep the values thunks so an ineligible module is never imported.
 *
 * This mirrors the frontend seam in `editor-ui/src/app/modules.manifest.ts`.
 *
 * Empty for now - the first backend module package has not landed yet.
 */
export const packagedModules: PackagedModules = {};
