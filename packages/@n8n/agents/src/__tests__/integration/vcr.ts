/**
 * VCR helpers for integration tests.
 *
 * Provides pure utilities consumed by the setup file
 * (vitest.integration.setup.ts) which drives nockBack recording/replay.
 */
import path from 'path';
import { type TestContext } from 'vitest';

/**
 * Whether we are in HTTP recording mode (VCR_MODE=record).
 */
export const IS_RECORD_MODE = process.env.VCR_MODE === 'record';

/**
 * Whether we are in HTTP replay mode (CI env variable is set).
 * In this mode all outgoing HTTP is blocked and cassettes are required.
 */
export const IS_REPLAY_MODE = Boolean(process.env.CI);

/**
 * Convert a vitest task into the cassette sub-path used by nockBack.
 *
 * Structure: `{test-file-basename}/{sanitized-test-name}.json`
 * Example:   `tool-interrupt/pauses-the-stream-when-a-tool-suspends.json`
 */
export function cassetteName(ctx: TestContext): string {
	const fileBase = path.basename(ctx.task.file?.name ?? 'unknown', '.test.ts');
	const name = sanitize(ctx.task.name);
	return `${fileBase}/${name}.json`;
}

/**
 * Sanitize an arbitrary string into a filesystem-safe lowercase slug.
 */
function sanitize(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120);
}
