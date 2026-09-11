// Builds native (non-wasm) `pcre2test` from the vendored vendor/pcre2 submodule and
// runs cases through it directly -- trusting our own wasm engine's output as a stand-in
// for "real PCRE2" would be circular and could never catch a bug in our shim.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { encodePcre2TestSubject, PCRE2TEST_DELIMITERS } from './decode-pcre2test-string.mjs';
import { parseTestOutput } from './parse-pcre2-testoutput.mjs';

const FLAG_TO_MODIFIER = { i: 'i', m: 'm', s: 's', x: 'x', u: 'utf' };

// Picking a delimiter that never appears in the pattern avoids an escaping ambiguity:
// a pattern already containing a real `\/` would otherwise be indistinguishable from a
// `/` escaped only for delimiter safety, corrupting the header round-trip.

// Raw control characters (e.g. from a JS-decoded [\x00-\x1f]) would corrupt line-based
// parsing for every pattern after them in the batch, so re-escape as \xHH first.
function sanitizePatternForScript(pattern) {
  let out = '';
  for (const ch of pattern) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || code === 0x7f) {
      out += `\\x${code.toString(16).padStart(2, '0')}`;
    } else if (code >= 0xd800 && code <= 0xdfff) {
      // A lone (unpaired) surrogate can't be encoded as valid UTF-8: execSync would
      // silently corrupt it to U+FFFD when writing the script to the subprocess's stdin.
      // Escape it as a PCRE2 pattern hex escape instead, which survives the trip intact.
      out += `\\x{${code.toString(16)}}`;
    } else {
      out += ch;
    }
  }
  return out;
}

function pickDelimiter(pattern) {
  for (const d of PCRE2TEST_DELIMITERS) {
    if (!pattern.includes(d)) return d;
  }
  return null; // pattern contains every candidate -- vanishingly rare
}

export function buildPcre2TestOracle(root) {
  const buildDir = path.join(root, 'native-oracle-build');
  const binary = path.join(buildDir, 'pcre2test');
  const fingerprintFile = path.join(buildDir, '.fingerprint');

  // A stale binary would silently oracle against an outdated PCRE2 -- fingerprint on the
  // vendored submodule's checked-out commit so a bump (or a dirty local checkout) forces
  // a rebuild instead of reusing whatever happened to be built last.
  const vendorRev = execFileSync('git', ['-C', path.join(root, 'vendor/pcre2'), 'rev-parse', 'HEAD'])
    .toString('utf8')
    .trim();
  const fingerprint = `${vendorRev}\n`;
  const cachedFingerprint = fs.existsSync(fingerprintFile) ? fs.readFileSync(fingerprintFile, 'utf8') : null;

  if (!fs.existsSync(binary) || cachedFingerprint !== fingerprint) {
    fs.rmSync(buildDir, { recursive: true, force: true });
    fs.mkdirSync(buildDir, { recursive: true });
    execFileSync(
      'cmake',
      [
        path.join(root, 'vendor/pcre2'),
        '-DPCRE2_BUILD_TESTS=ON',
        '-DPCRE2_BUILD_PCRE2GREP=OFF',
        '-DBUILD_SHARED_LIBS=OFF',
        // Our wrapper is the 16-bit library (native/pcre2_wrapper.h); an 8-bit-only
        // oracle would compare UTF-8 byte semantics against our UTF-16 code-unit
        // semantics for any astral-character case -- keep both so pcre2test can
        // select 16-bit at runtime via `-16` below.
        '-DPCRE2_BUILD_PCRE2_16=ON',
      ],
      { cwd: buildDir, stdio: 'inherit' },
    );
    execFileSync('cmake', ['--build', '.', '--target', 'pcre2test', '-j4'], {
      cwd: buildDir,
      stdio: 'inherit',
    });
    fs.writeFileSync(fingerprintFile, fingerprint);
  }

  function flagsToModifiers(flags) {
    const modifiers = [...flags].filter((f) => f in FLAG_TO_MODIFIER).map((f) => FLAG_TO_MODIFIER[f]);
    // Must mirror native/pcre2_wrapper.cpp's compile options exactly, or the oracle
    // isn't testing what our shim actually does. `utf` is not in this list: it comes
    // from the `u` flag alone (FLAG_TO_MODIFIER), same as in the wrapper.
    modifiers.push('alt_bsux', 'extra_alt_bsux', 'match_unset_backref');
    // The text after a match, needed to recover the match's start offset (see
    // runBatch's offset arithmetic below) -- pcre2test's default output never prints
    // a numeric offset, only the matched text itself.
    modifiers.push('aftertext');
    return modifiers;
  }

  // pcre2test requires single-character flags glued together before any named modifier
  // (`i,s,utf` is rejected; must be `is,utf`).
  function modifiersToScriptString(modifiers) {
    const single = modifiers.filter((m) => m.length === 1).join('');
    const named = modifiers.filter((m) => m.length > 1);
    return [single, ...named].filter((s) => s.length > 0).join(',');
  }

  // Batches all cases into one pcre2test subprocess invocation rather than one process
  // per case (process startup would otherwise dominate). Returns a parallel array:
  // null if pcre2test couldn't compile the pattern, otherwise { matched, whole, groups }.
  function runBatch(cases) {
    // Computed once per case and reused for the lookup key below: keying on the
    // unsanitized pattern would reintroduce the delimiter-escaping bug.
    const scriptPatterns = cases.map((c) => sanitizePatternForScript(c.pattern));

    const runnable = []; // indices into `cases` that got a usable delimiter
    const scriptBlocks = [];
    for (let i = 0; i < cases.length; i++) {
      const { flags, input } = cases[i];
      const pattern = scriptPatterns[i];
      const delimiter = pickDelimiter(pattern);
      if (delimiter === null) continue; // vanishingly rare -- see pickDelimiter

      const modifiers = flagsToModifiers(flags);
      // An empty subject line is indistinguishable from pcre2test's blank-line block
      // separator, so use its `\=startchar` escape (an inert modifier) instead.
      const subjectLine =
        input === '' ? '\\=startchar' : encodePcre2TestSubject(input, flags.includes('u'));
      runnable.push(i);
      scriptBlocks.push(`${delimiter}${pattern}${delimiter}${modifiersToScriptString(modifiers)}\n    ${subjectLine}`);
    }

    // A blank line must separate pattern blocks, or pcre2test misattributes results.
    const script = scriptBlocks.join('\n\n') + '\n';

    let stdout = '';
    if (scriptBlocks.length > 0) {
      try {
        // -16 selects the 16-bit library, matching native/pcre2_wrapper.h's build width.
        stdout = execSync(`${binary} -16 -q`, {
          input: script,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 64,
        });
      } catch (error) {
        // pcre2test exits non-zero (a numeric `.status`) if any pattern fails to compile,
        // but still prints usable output for the rest of the batch -- only that specific,
        // expected failure mode should fall through to using partial stdout. A spawn
        // failure (no `.status`, e.g. ENOENT) or a maxBuffer overflow (stdout may be
        // truncated mid-block) means the run itself can't be trusted, so it must propagate
        // instead of silently masquerading as a valid (if incomplete) oracle result.
        if (typeof error.status !== 'number' || error.stdout === undefined) throw error;
        stdout = error.stdout;
      }
    }

    const { blocks } = parseTestOutput(stdout);
    // A pattern pcre2test couldn't compile is dropped from `blocks`, breaking positional
    // alignment -- re-match by (pattern, modifiers) key instead of index.
    const queue = new Map(); // "pattern modifiers" -> block[]
    for (const block of blocks) {
      const key = block.pattern + ' ' + block.modifiers.slice().sort().join('');
      if (!queue.has(key)) queue.set(key, []);
      queue.get(key).push(block);
    }

    const runnableSet = new Set(runnable);
    return cases.map(({ flags, input }, i) => {
      if (!runnableSet.has(i)) return null;
      const key = scriptPatterns[i] + ' ' + flagsToModifiers(flags).slice().sort().join('');
      const bucket = queue.get(key);
      if (!bucket || bucket.length === 0) return null; // pcre2test rejected this pattern
      const block = bucket.shift();
      const subject = block.subjects[0];
      if (!subject) return null;
      if (subject.noMatch) return { matched: false };
      const whole = subject.groups[0];
      // aftertext's "0+" line is exactly the subject text following the match, with no
      // ambiguity -- the match must start exactly where that much text is left over.
      const afterText = subject.afterText?.[0] ?? '';
      const index = input.length - afterText.length - whole.length;
      return { matched: true, whole, groups: subject.groups.slice(1), index };
    });
  }

  return { runBatch };
}
