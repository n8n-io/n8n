/**
 * Extract Test Workflows from the test-fixtures zip.
 *
 * test-fixtures/real-workflows/public_published_templates.zip → test-fixtures/real-workflows/
 *
 * Runs automatically via Vitest's globalSetup (see scripts/vitest-global-setup.ts).
 *
 * Usage:
 *   npx tsx scripts/extract-workflows.ts
 */

import { ensureFixtures } from '../src/__tests__/fixtures-download';

ensureFixtures();
