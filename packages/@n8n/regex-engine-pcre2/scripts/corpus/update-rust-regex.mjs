#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const SUBMODULE_DIR = path.join(PACKAGE_ROOT, 'vendor', 'rust-regex');
const ref = process.argv[2] ?? 'origin/master';

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

run('git', ['fetch', 'origin'], SUBMODULE_DIR);
run('git', ['checkout', ref], SUBMODULE_DIR);

const newCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: SUBMODULE_DIR, encoding: 'utf8' }).trim();
console.log(`vendor/rust-regex is now at ${ref} (${newCommit})`);

// Stage the gitlink only once the corpus actually regenerated -- staging it first and
// then having the build fail would leave a commit-ready submodule bump with no matching
// corpus data behind it.
run('pnpm', ['corpus:build'], PACKAGE_ROOT);
run('git', ['add', 'vendor/rust-regex'], PACKAGE_ROOT);

console.log('Corpus regenerated. Review the diff, run `pnpm test`, and commit.');
