// Builds native (non-wasm) `pcre2test` from the vendored vendor/pcre2 submodule and
// runs cases through it directly -- trusting our own wasm engine's output as a stand-in
// for "real PCRE2" would be circular and could never catch a bug in our shim.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { encodePcre2TestSubject } from './decode-pcre2test-string.mjs';
import { parseTestOutput } from './parse-pcre2-testoutput.mjs';

const FLAG_TO_MODIFIER = { i: 'i', m: 'm', s: 's', x: 'x' }; // 'u' has no pcre2test modifier -- see runBatch

// Picking a delimiter that never appears in the pattern avoids an escaping ambiguity:
// a pattern already containing a real `\/` would otherwise be indistinguishable from a
// `/` escaped only for delimiter safety, corrupting the header round-trip. Excludes
// `#`, pcre2test's comment-line character.
const DELIMITER_CANDIDATES = ['/', '~', '!', '%', '&', '=', ';', '`'];

// Raw control characters (e.g. from a JS-decoded [\x00-\x1f]) would corrupt line-based
// parsing for every pattern after them in the batch, so re-escape as \xHH first.
function sanitizePatternForScript(pattern) {
  let out = '';
  for (const ch of pattern) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || code === 0x7f) {
      out += `\\x${code.toString(16).padStart(2, '0')}`;
    } else {
      out += ch;
    }
  }
  return out;
}

function pickDelimiter(pattern) {
  for (const d of DELIMITER_CANDIDATES) {
    if (!pattern.includes(d)) return d;
  }
  return null; // pattern contains every candidate -- vanishingly rare
}

export function buildPcre2TestOracle(root) {
  const buildDir = path.join(root, 'native-oracle-build');
  const binary = path.join(buildDir, 'pcre2test');

  if (!fs.existsSync(binary)) {
    fs.mkdirSync(buildDir, { recursive: true });
    execFileSync(
      'cmake',
      [
        path.join(root, 'vendor/pcre2'),
        '-DPCRE2_BUILD_TESTS=ON',
        '-DPCRE2_BUILD_PCRE2GREP=OFF',
        '-DBUILD_SHARED_LIBS=OFF',
      ],
      { cwd: buildDir, stdio: 'inherit' },
    );
    execFileSync('cmake', ['--build', '.', '--target', 'pcre2test', '-j4'], {
      cwd: buildDir,
      stdio: 'inherit',
    });
  }

  function flagsToModifiers(flags) {
    const modifiers = [...flags].filter((f) => f in FLAG_TO_MODIFIER).map((f) => FLAG_TO_MODIFIER[f]);
    // Must mirror native/pcre2_wrapper.cpp's always-on compile options exactly, or the
    // oracle isn't testing what our shim actually does.
    modifiers.push('utf', 'alt_bsux', 'extra_alt_bsux', 'match_unset_backref');
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
      const subjectLine = input === '' ? '\\=startchar' : encodePcre2TestSubject(input);
      runnable.push(i);
      scriptBlocks.push(`${delimiter}${pattern}${delimiter}${modifiersToScriptString(modifiers)}\n    ${subjectLine}`);
    }

    // A blank line must separate pattern blocks, or pcre2test misattributes results.
    const script = scriptBlocks.join('\n\n') + '\n';

    let stdout = '';
    if (scriptBlocks.length > 0) {
      try {
        stdout = execSync(`${binary} -q`, { input: script, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
      } catch (error) {
        // pcre2test exits non-zero if any pattern fails to compile but still prints
        // output for the rest -- use stdout regardless of exit code.
        stdout = error.stdout ?? '';
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
    return cases.map(({ flags }, i) => {
      if (!runnableSet.has(i)) return null;
      const key = scriptPatterns[i] + ' ' + flagsToModifiers(flags).slice().sort().join('');
      const bucket = queue.get(key);
      if (!bucket || bucket.length === 0) return null; // pcre2test rejected this pattern
      const block = bucket.shift();
      const subject = block.subjects[0];
      if (!subject) return null;
      if (subject.noMatch) return { matched: false };
      return { matched: true, whole: subject.groups[0], groups: subject.groups.slice(1) };
    });
  }

  return { runBatch };
}
