import libc from 'detect-libc';
import * as abi from 'node-abi';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getModuleName() {
  const stdlib = libc.familySync();
  const platform = process.env['BUILD_PLATFORM'] || os.platform();
  const arch = process.env['BUILD_ARCH'] || os.arch();
  const identifier = [platform, arch, stdlib, abi.getAbi(process.versions.node, 'node')].filter(Boolean).join('-');
  return `stack-trace-${identifier}.node`;
}

export const source = path.join(__dirname, '..', 'build', 'Release', 'stack-trace.node');
export const target = path.join(__dirname, '..', 'lib', getModuleName());
