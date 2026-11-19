/**
 * Vitest globalSetup hook: extract the committed zip into the expected on-disk
 * layout before any test file is collected. The roundtrip tests generate one
 * test for each workflow at collection time, so extraction in a `beforeAll`
 * hook is too late. We can't rely on npm/pnpm's pretest hook here because CI
 * invokes `test:unit` (turbo task), not `test`.
 */
import { ensureFixtures } from '../src/__tests__/fixtures-download';

export default function setup() {
	ensureFixtures();
}
