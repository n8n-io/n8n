import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `useTelemetry` moved to `@n8n/frontend-utils` (N8N-100) and this package keeps
 * a re-export at the old path. That is only safe while both paths resolve to
 * *one* module instance, because `useTelemetry` reads a module-level registered
 * instance: `editor-ui`'s telemetry plugin calls `setTelemetry` through
 * `@n8n/composables/useTelemetry`, while `useToast` in this package reads it
 * through `./useTelemetry`. Two copies means the plugin registers into one and
 * `useToast` reads the other — telemetry silently degrades to the no-op.
 *
 * `editor-ui`'s `useTelemetry.singleton.test.ts` asserts the behaviour. This
 * file guards the *build* half: `tsdown.config.ts` sets no `noExternal`, so
 * declared workspace dependencies stay external and the emitted bundle forwards
 * rather than inlining a second copy of the implementation. Consumers that read
 * this package from `dist` — `@n8n/design-system` — depend on that holding.
 */
describe('useTelemetry re-export (built output)', () => {
	// `process.cwd()` rather than `import.meta.url`: the jsdom environment does
	// not give test modules a `file:` URL. Vitest runs with the package as cwd.
	const distDir = join(process.cwd(), 'dist');

	beforeAll(() => {
		// `test` depends on this package's own `build` in turbo.json, so `dist`
		// exists in CI. Locally, run `pnpm build` in this package first.
		expect(
			existsSync(distDir),
			`${distDir} is missing — run \`pnpm build\` in this package before \`pnpm test\`.`,
		).toBe(true);
	});

	it('forwards the entry to @n8n/frontend-utils', () => {
		const entry = readFileSync(join(distDir, 'useTelemetry.mjs'), 'utf8');

		expect(entry).toContain('@n8n/frontend-utils/useTelemetry');
	});

	it('inlines no copy of the telemetry module state', () => {
		// Scanning every bundle, not just the entry, because rolldown may move the
		// re-export into a shared chunk (it currently emits `useTelemetry2.mjs`).
		const bundles = readdirSync(distDir).filter((file) => /\.(mjs|cjs)$/.test(file));
		expect(bundles.length).toBeGreaterThan(0);

		// `registeredTelemetry` is the implementation's module-level state; it must
		// exist in `@n8n/frontend-utils`' bundle and nowhere in ours.
		const withInlinedState = bundles.filter((file) =>
			readFileSync(join(distDir, file), 'utf8').includes('registeredTelemetry'),
		);

		expect(withInlinedState).toEqual([]);
	});
});
