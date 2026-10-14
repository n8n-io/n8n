#!/usr/bin/env node
// Git hook helper (post-merge, post-rewrite, post-checkout): warn when the
// installed pnpm major differs from the one pinned in package.json.
// Usage: node .githooks/check-pnpm.mjs [checkout-type]
// For post-checkout, pass lefthook's {3}: "0" is a file checkout, which we skip.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

if (process.argv[2] === '0') process.exit(0);

const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));
const { packageManager = '' } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const wanted = /^pnpm@(\d+)/.exec(packageManager)?.[1];

if (!wanted) process.exit(0);

// Run from the home dir so pnpm reports the installed version,
// not the version pinned by this repo.
// `shell` lets Windows resolve pnpm.cmd. The command has no user input.
const result = spawnSync('pnpm --version', { cwd: homedir(), shell: true, encoding: 'utf8' });
const current = result.status === 0 ? result.stdout.trim().split('.')[0] : '';
if (wanted === current) process.exit(0);

const installCommand =
	process.platform === 'win32'
		? 'powershell -c "irm https://get.pnpm.io/install.ps1 | iex"'
		: 'curl -fsSL https://get.pnpm.io/install.sh | sh -';

console.log(`
⚠ This repo now pins pnpm ${wanted} (you have ${current || 'none'}).
  pnpm should auto-download it on the next install command.
  If that fails (some pnpm 10 versions can't install v12), reinstall:
    ${installCommand}
`);
