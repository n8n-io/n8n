#!/usr/bin/env node
// PCRE2 only signs tags from release 10.45 onwards (see vendor/pcre2/SECURITY.md).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const PCRE2_DIR = path.join(PACKAGE_ROOT, 'vendor', 'pcre2');
const KEYSERVER = 'keys.openpgp.org';

// PCRE2 release-signing key (Nicholas Wilson), confirmed via `git verify-tag` on pcre2-10.45/10.48.
const EXPECTED_FINGERPRINT = 'BACF71F10404D5761C09D392021DE40BFB63B406';

function git(args) {
  return execFileSync('git', args, { cwd: PCRE2_DIR, encoding: 'utf8' }).trim();
}

function parseVersion(tag) {
  const match = /^pcre2-(\d+)\.(\d+)/.exec(tag);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function isAtLeast_10_45([major, minor]) {
  return major > 10 || (major === 10 && minor >= 45);
}

function importExpectedKey() {
  execFileSync('gpg', ['--keyserver', KEYSERVER, '--recv-keys', EXPECTED_FINGERPRINT], {
    stdio: 'inherit',
  });
}

function main() {
  let tag;
  try {
    tag = git(['describe', '--tags', '--exact-match']);
  } catch {
    console.error(
      `error: vendor/pcre2 is not checked out at a tag. Run the bump instructions in README.md first.`,
    );
    process.exit(1);
  }

  const version = parseVersion(tag);
  if (!version || !isAtLeast_10_45(version)) {
    console.log(`vendor/pcre2 is at ${tag}: unsigned releases (< 10.45), nothing to verify.`);
    return;
  }

  // Only the expected release-signing key is ever imported, so a successful verify-tag here can only mean that key signed it.
  function tryVerify() {
    return execFileSync('git', ['verify-tag', tag], { cwd: PCRE2_DIR, encoding: 'utf8', stdio: 'pipe' });
  }

  try {
    tryVerify();
  } catch (err) {
    const stderr = String(err.stderr ?? '');
    if (!stderr.includes('No public key')) {
      console.error(`error: signature verification failed for ${tag}:\n${stderr}`);
      process.exit(1);
    }
    console.log(`Importing PCRE2 release-signing key ${EXPECTED_FINGERPRINT} from ${KEYSERVER}...`);
    importExpectedKey();
    try {
      tryVerify();
    } catch (err2) {
      console.error(`error: signature verification failed for ${tag}:\n${err2.stderr}`);
      process.exit(1);
    }
  }

  console.log(`OK: ${tag} has a valid signature from the expected PCRE2 release-signing key.`);
}

main();
