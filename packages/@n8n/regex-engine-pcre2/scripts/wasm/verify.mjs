#!/usr/bin/env node
// Rebuilds the wasm module and fails if it differs from what's committed in src/generated/.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const GENERATED_DIR = path.join(PACKAGE_ROOT, 'src/generated');
const ARTIFACTS = ['pcre2_wrapper.js', 'pcre2_wrapper.wasm'];

const backupDir = mkdtempSync(path.join(tmpdir(), 'pcre2-wasm-verify-'));

try {
  for (const file of ARTIFACTS) {
    copyFileSync(path.join(GENERATED_DIR, file), path.join(backupDir, file));
  }

  console.log('==> Rebuilding wasm to check for drift against the committed artifact');
  execFileSync('node', [path.join(PACKAGE_ROOT, 'scripts/wasm/build.mjs')], { cwd: PACKAGE_ROOT, stdio: 'inherit' });

  let drifted = false;
  for (const file of ARTIFACTS) {
    const before = readFileSync(path.join(backupDir, file));
    const after = readFileSync(path.join(GENERATED_DIR, file));
    if (!before.equals(after)) {
      drifted = true;
      console.error(`drift: ${file} changed after a clean rebuild (${before.length} -> ${after.length} bytes)`);
    }
  }

  if (drifted) {
    console.error(
      '\nerror: the committed src/generated/ wasm is stale relative to native/*.cpp and/or the pinned PCRE2 submodule.\n' +
        'The freshly rebuilt files are left in place above -- review the diff and commit them.',
    );
    process.exit(1);
  }

  console.log('==> No drift. Restoring the original committed artifact (the rebuild is bit-for-bit identical).');
  for (const file of ARTIFACTS) {
    copyFileSync(path.join(backupDir, file), path.join(GENERATED_DIR, file));
  }
} finally {
  if (existsSync(backupDir)) rmSync(backupDir, { recursive: true, force: true });
}
