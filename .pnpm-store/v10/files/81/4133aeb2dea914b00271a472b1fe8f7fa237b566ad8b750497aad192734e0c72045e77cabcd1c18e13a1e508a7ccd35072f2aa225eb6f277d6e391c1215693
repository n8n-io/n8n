import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as binaries from './binaries.mjs';

const require = createRequire(import.meta.url);

function clean(err) {
  return err.toString().trim();
}

function recompileFromSource() {
  console.log('Compiling from source...');
  let spawn = child_process.spawnSync('node-gyp', ['configure'], {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: process.env,
    shell: true,
  });
  if (spawn.status !== 0) {
    console.log('Failed to configure gyp');
    console.log(clean(spawn.stderr));
    return;
  }
  spawn = child_process.spawnSync('node-gyp', ['build'], {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: process.env,
    shell: true,
  });
  if (spawn.status !== 0) {
    console.log('Failed to build bindings');
    console.log(clean(spawn.stderr));
    return;
  }
}

if (fs.existsSync(binaries.target)) {
  try {
    require(binaries.target);
    console.log('Precompiled binary found, skipping build from source.');
  } catch (e) {
    console.log('Precompiled binary found but failed loading');
    if (process.env.ALWAYS_THROW) {
      throw e;
    } else {
      console.log(e);
    }
    try {
      recompileFromSource();
    } catch (e) {
      console.log('Failed to compile from source');
      throw e;
    }
  }
} else {
  console.log('No precompiled binary found');
  recompileFromSource();
}
