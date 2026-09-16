#!/usr/bin/env node
// PCRE2 only signs tags from release 10.45 onwards (see vendor/pcre2/SECURITY.md).
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const PCRE2_DIR = path.join(PACKAGE_ROOT, 'vendor', 'pcre2');
const KEYSERVER = 'keys.openpgp.org';

// PCRE2 release-signing key (Nicholas Wilson), per vendor/pcre2/SECURITY.md.
// Cross-signed by Philip Hazel's key for continuity, but only Wilson's fingerprint is accepted.
const EXPECTED_FINGERPRINT = 'A95536204A3BB489715231282A98E77EB6F24CA8';

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: PCRE2_DIR, encoding: 'utf8', ...options }).trim();
}

function parseVersion(tag) {
  // Fully anchored: a suffix like "-local" must not parse as a plain release tag.
  const match = /^pcre2-(\d+)\.(\d+)(?:\.(\d+))?$/.exec(tag);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function isAtLeast_10_45([major, minor]) {
  return major > 10 || (major === 10 && minor >= 45);
}

function importExpectedKey(gnupgHome) {
  execFileSync(
    'gpg',
    ['--homedir', gnupgHome, '--keyserver', KEYSERVER, '--recv-keys', EXPECTED_FINGERPRINT],
    { stdio: 'inherit', env: { ...process.env, GNUPGHOME: gnupgHome } },
  );
}

// `git verify-tag` alone only proves *some* trusted key signed the tag, never which one.
// Parses GnuPG's machine-readable status lines to get every VALIDSIG/GOODSIG fingerprint,
// so main() can require the signer to actually be EXPECTED_FINGERPRINT.
function extractSignerFingerprints(rawOutput) {
  const fingerprints = new Set();
  for (const line of rawOutput.split('\n')) {
    const trimmed = line.trim();
    // [GNUPG:] VALIDSIG <fpr> <date> <ts> <expire-ts> <ver> <reserved> <pubkey-algo> <hash-algo> <sig-class> <primary-fpr>
    const validsig = /^\[GNUPG:\]\s+VALIDSIG\s+(\S+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(\S+)/.exec(
      trimmed,
    );
    if (validsig) {
      fingerprints.add(validsig[1].toUpperCase());
      fingerprints.add(validsig[2].toUpperCase());
      continue;
    }
    // [GNUPG:] GOODSIG <keyid> <username...>
    const goodsig = /^\[GNUPG:\]\s+GOODSIG\s+(\S+)/.exec(trimmed);
    if (goodsig) {
      fingerprints.add(goodsig[1].toUpperCase());
    }
  }
  return fingerprints;
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
  if (!version) {
    console.error(
      `error: vendor/pcre2 is checked out at "${tag}", which doesn't look like a pcre2-X.Y tag. Refusing to treat this as "nothing to verify".`,
    );
    process.exit(1);
  }
  if (!isAtLeast_10_45(version)) {
    console.error(
      `error: vendor/pcre2 is checked out at ${tag}, which is below the minimum signed release (pcre2-10.45). ` +
        `This looks like a downgrade to an unsigned release and is rejected.`,
    );
    process.exit(1);
  }

  const gnupgHome = mkdtempSync(path.join(tmpdir(), 'pcre2-verify-tag-gnupghome-'));
  try {
    // Dedicated, empty GNUPGHOME: no key on the operator's ambient keyring can satisfy the check.
    importExpectedKey(gnupgHome);

    // spawnSync, not execFileSync: git writes the GnuPG status lines to stderr on every exit code.
    const result = spawnSync('git', ['verify-tag', '--raw', tag], {
      cwd: PCRE2_DIR,
      encoding: 'utf8',
      env: { ...process.env, GNUPGHOME: gnupgHome },
    });
    const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    const fingerprints = extractSignerFingerprints(combined);

    // Returned, not process.exit()'d, so the gnupgHome cleanup below always runs.
    if (!fingerprints.has(EXPECTED_FINGERPRINT)) {
      console.error(
        `error: ${tag} was NOT signed by the expected PCRE2 release-signing key (${EXPECTED_FINGERPRINT}). ` +
          `Signer(s) found: ${[...fingerprints].join(', ') || '<none>'}\n${combined}`,
      );
      return 1;
    }
    if (result.status !== 0) {
      // Right key, but git still errored (e.g. untrusted/expired) -- don't accept on fingerprint alone.
      console.error(`error: signature verification failed for ${tag}:\n${combined}`);
      return 1;
    }

    console.log(`OK: ${tag} has a valid signature from the expected PCRE2 release-signing key (${EXPECTED_FINGERPRINT}).`);
    return 0;
  } finally {
    rmSync(gnupgHome, { recursive: true, force: true });
  }
}

process.exit(main());
