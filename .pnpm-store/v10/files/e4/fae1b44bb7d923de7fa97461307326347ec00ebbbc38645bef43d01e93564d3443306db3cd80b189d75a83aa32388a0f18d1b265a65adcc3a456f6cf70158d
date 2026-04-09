const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const targetArgs = [
  '--strip',
  '--no-napi',
  '--target',
  '22.22.0',
  '--target',
  '24.14.0',
];

if (process.platform === 'linux') {
  targetArgs.push('--tag-libc');
}

const env = {
  ...process.env,
  MAKEFLAGS: `-j${os.cpus().length}`,
};

fs.rmSync(path.join(__dirname, '..', 'prebuilds'), { recursive: true, force: true });

const prebuildifyCli = require.resolve('prebuildify/bin.js');
const result = spawnSync(process.execPath, [prebuildifyCli, ...targetArgs], { stdio: 'inherit', env });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
