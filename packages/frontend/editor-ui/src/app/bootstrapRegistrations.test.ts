import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `main.ts` boots the app, so it cannot be imported into a unit test. These
 * registrations are still load-bearing and silent when missing:
 *
 * - drop `registerUpgradeRedirectGuard` and an upgrade CTA raised from a module
 *   package skips the AI-builder confirmation, because the registry fails open;
 * - drop `registerComponentSlots` and the insights dashboard renders no project
 *   picker, because an unregistered slot resolves to `undefined`.
 *
 * Both failures are invisible to every other test, so this asserts the call sites
 * exist. It is the same shape as `vite/aliases.test.ts`, which reads config files
 * to hold two of them in step.
 */
const mainTs = readFileSync(join(process.cwd(), 'src', 'main.ts'), 'utf8');

describe('main.ts bootstrap registrations', () => {
	it.each([
		['registerUpgradeRedirectGuard', '@/app/upgradeRedirectGuard.manifest'],
		['registerComponentSlots', '@/app/componentSlots.manifest'],
	])('imports %s from %s and calls it', (fn, from) => {
		expect(mainTs).toContain(`import { ${fn} } from '${from}';`);
		expect(mainTs).toMatch(new RegExp(`^${fn}\\(\\);$`, 'm'));
	});
});
