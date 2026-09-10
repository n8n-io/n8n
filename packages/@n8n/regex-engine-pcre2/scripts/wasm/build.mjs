#!/usr/bin/env node
// Prefers Docker's pinned emsdk image, since a locally installed emsdk can silently drift.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const EMSDK_VERSION = readFileSync(path.join(PACKAGE_ROOT, '.emsdk-version'), 'utf8').trim();

function commandExists(cmd) {
  try {
    if (process.platform === 'win32') {
      execFileSync('where', [cmd], { stdio: 'ignore' });
    } else {
      execFileSync('/bin/sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: PACKAGE_ROOT, stdio: 'inherit' });
}

if (commandExists('docker')) {
  console.log(`==> Building via Docker (emscripten/emsdk:${EMSDK_VERSION})`);
  run('docker', [
    'run',
    '--rm',
    '-v',
    `${PACKAGE_ROOT}:/src`,
    '-w',
    '/src',
    `emscripten/emsdk:${EMSDK_VERSION}`,
    'bash',
    'scripts/wasm/build-wasm.sh',
  ]);
} else if (commandExists('emcc')) {
  console.log('==> Docker not found; using the emcc already active on PATH');
  console.log(`    (expected version ${EMSDK_VERSION} -- build-wasm.sh will warn if it doesn't match)`);
  run('bash', ['scripts/wasm/build-wasm.sh']);
} else {
  console.error(
    [
      'error: neither `docker` nor `emcc` was found.',
      '',
      'Install Docker (recommended) and re-run `pnpm build:wasm`, or activate a',
      `local emsdk pinned to ${EMSDK_VERSION} first:`,
      '',
      `  ./emsdk install ${EMSDK_VERSION}`,
      `  ./emsdk activate ${EMSDK_VERSION}`,
      '  source ./emsdk_env.sh',
      '  pnpm build:wasm',
    ].join('\n'),
  );
  process.exit(1);
}

if (!existsSync(path.join(PACKAGE_ROOT, 'src/generated/pcre2_wrapper.wasm'))) {
  console.error('error: build finished but src/generated/pcre2_wrapper.wasm is still missing.');
  process.exit(1);
}

console.log('==> pnpm build:wasm done. Review the src/generated/ diff and commit it.');
