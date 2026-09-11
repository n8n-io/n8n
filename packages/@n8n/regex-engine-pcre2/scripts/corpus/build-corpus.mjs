#!/usr/bin/env node
// Classifies each case by comparing our engine, native V8 RegExp, and a real pcre2test
// oracle -- never by trusting a source corpus's own stated "expected" value.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { createPcre2RegexEngine, initPcre2Engine, Pcre2CompileError, Pcre2BudgetExceededError } from '../../dist/pcre2-engine.js';
import { parseTestToml } from './parse-rust-regex-toml.mjs';
import { parseTestOutput } from './parse-pcre2-testoutput.mjs';
import { normalizeRustRegexBlocks, normalizePcre2Blocks } from './normalize.mjs';
import { buildPcre2TestOracle } from './pcre2test-oracle.mjs';
import { loadSyntheticCases } from './synthetic-source.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const RUST_REGEX_DIR = path.join(ROOT, 'vendor/rust-regex/testdata');
const OUT_DIR = path.join(ROOT, 'test/fixtures/corpus');
const BATCH_SIZE = 500;

const RUST_REGEX_FILES = [
  ['word-boundary.toml', 'word-boundary'],
  // word-boundary-special.toml excluded: its `\b{start}`/etc. is a rust-regex-only
  // extension that happens to "compile" under both engines by coincidence.
  ['multiline.toml', 'multiline'],
  ['unicode.toml', 'unicode'],
  ['crazy.toml', 'crazy'],
  ['misc.toml', 'misc'],
  ['no-unicode.toml', 'no-unicode'],
  ['fowler/basic.toml', 'fowler-basic'],
  ['fowler/repetition.toml', 'fowler-repetition'],
  ['fowler/nullsubexpr.toml', 'fowler-nullsubexpr'],
];
// One shared category so build-corpus.mjs writes all rust-regex cases into a single
// file; the source .toml's own category is preserved per-case via `tags` for traceability.
const RUST_REGEX_MERGED_CATEGORY = 'rust-regex-corpus';

function loadRustRegexCases() {
  const cases = [];
  for (const [file, category] of RUST_REGEX_FILES) {
    const text = fs.readFileSync(path.join(RUST_REGEX_DIR, file), 'utf8');
    const blocks = parseTestToml(text);
    for (const c of normalizeRustRegexBlocks(blocks, category)) {
      cases.push({ ...c, category: RUST_REGEX_MERGED_CATEGORY, tags: [category] });
    }
  }
  return cases;
}

function loadPcre2Cases() {
  const text = execSync('iconv -f latin1 -t utf-8 vendor/pcre2/testdata/testoutput1', {
    cwd: ROOT,
  }).toString('utf8');
  const { blocks } = parseTestOutput(text);
  return normalizePcre2Blocks(blocks, 'pcre2-testinput1');
}

function tryNative(pattern, flags, input) {
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch {
    return null;
  }
  const m = re.exec(input);
  if (!m) return { matched: false };
  return { matched: true, whole: m[0], groups: m.slice(1), index: m.index, namedGroups: m.groups };
}

function namedGroupsEqual(a, b) {
  if (a === b) return true; // both undefined -- neither pattern has named groups
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

// pcre2test's default output doesn't echo a trailing group that never participated --
// its `groups` array can end up shorter than ours/native's for that reason alone, not
// because the group is genuinely different. A missing trailing entry reads as `undefined`
// on both sides either way, so pad rather than treat the length difference as a mismatch.
function groupsEqual(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function resultsEqual(a, b) {
  if (!a || !b) return a === b;
  if (!a.matched || !b.matched) return a.matched === b.matched;
  if (a.whole !== b.whole) return false;
  if (!groupsEqual(a.groups, b.groups)) return false;
  // Same matched text + captures can still hide a wrong start position (e.g. `/a/` on
  // `ba` matching the right letter at the wrong offset) -- only compared when both
  // sides report one, since the oracle didn't always carry it.
  if ('index' in a && 'index' in b && a.index !== b.index) return false;
  // Only ours/native carry named groups (the oracle doesn't tell us group names), so
  // this only ever fires for that one comparison -- harmless no-op otherwise.
  if ('namedGroups' in a && 'namedGroups' in b && !namedGroupsEqual(a.namedGroups, b.namedGroups)) {
    return false;
  }
  return true;
}

function runOurEngine(engine, c) {
  try {
    const r = engine.exec(c.pattern, c.input, c.flags);
    return {
      result:
        r === null
          ? { matched: false }
          : { matched: true, whole: r[0], groups: r.slice(1), index: r.index, namedGroups: r.groups },
    };
  } catch (error) {
    if (error instanceof Pcre2CompileError) return { compileError: true };
    if (error instanceof Pcre2BudgetExceededError) return { budgetError: true };
    return { otherError: String(error) };
  }
}

async function main() {
  await initPcre2Engine();
  // Must match the oracle's dialect (pcre2test-oracle.mjs) and what corpus.test.ts assumes.
  const engine = createPcre2RegexEngine({ compileOptions: ['altBsux', 'matchUnsetBackref'], jsFlags: ['g', 'u'] });
  const oracle = buildPcre2TestOracle(ROOT);

  const allCases = [...loadRustRegexCases(), ...loadPcre2Cases(), ...loadSyntheticCases()];

  // One pcre2test subprocess per batch, not per case -- this corpus is thousands of cases.
  const oracleResults = new Array(allCases.length);
  for (let i = 0; i < allCases.length; i += BATCH_SIZE) {
    const batch = allCases.slice(i, i + BATCH_SIZE);
    const results = oracle.runBatch(batch);
    for (let j = 0; j < results.length; j++) oracleResults[i + j] = results[j];
  }

  const esAgree = [];
  const esDiverge = [];
  const engineBugs = [];
  const excluded = [];

  for (let i = 0; i < allCases.length; i++) {
    const c = allCases[i];
    const realPcre2 = oracleResults[i];
    const ours = runOurEngine(engine, c);

    if (realPcre2 === null) {
      if (ours.result !== undefined) {
        excluded.push({ id: c.id, reason: 'our-engine-accepts-pattern-real-pcre2-rejects', pattern: c.pattern });
      } else {
        excluded.push({ id: c.id, reason: 'uncompilable-by-either', pattern: c.pattern });
      }
      continue;
    }
    if (ours.result === undefined) {
      excluded.push({
        id: c.id,
        reason: ours.compileError ? 'our-engine-rejects-pattern-real-pcre2-accepts' : 'our-engine-error-on-probe',
        pattern: c.pattern,
        detail: ours.otherError,
      });
      continue;
    }

    const native = tryNative(c.pattern, c.flags, c.input);
    const record = { ...c, realPcre2, ourResult: ours.result, nativeResult: native };

    if (!resultsEqual(ours.result, realPcre2)) {
      engineBugs.push(record);
      continue;
    }

    if (native === null) {
      esAgree.push({ ...record, validity: 'pcre2-only' });
    } else if (resultsEqual(native, realPcre2)) {
      esAgree.push({ ...record, validity: 'es-pcre2-agree' });
    } else {
      esDiverge.push({ ...record, validity: 'es-pcre2-divergence' });
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Same (pattern, flags, input) twice adds no coverage; keeps the first occurrence.
  function dedupBy(cases, keyFn) {
    const seen = new Set();
    const out = [];
    for (const c of cases) {
      const key = keyFn(c);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }
  const caseKey = (c) => JSON.stringify([c.pattern, c.flags, c.input]);

  // Dedup globally: the same triple can land in two categories, which a per-category pass would miss.
  const dedupedAgree = dedupBy(esAgree, caseKey);
  const byCategory = new Map();
  for (const c of dedupedAgree) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
    byCategory.get(c.category).push(c);
  }
  // Machine-generated/-read corpus, so on-disk shape optimizes for size over readability:
  // tuples not objects (object keys would dwarf 14k+ entries' data);
  // no `id` (was 14% of bytes, only used for test titles -- index is just as traceable);
  // `validity` packed to 1/0 (was 32% of bytes as a repeated string);
  // match result packed to `null`/`[whole, ...groups]` (was 21% of remaining bytes).
  function packResult(r) {
    return r.matched ? [r.whole, ...r.groups] : null;
  }

  const RUST_REGEX_OUT_DIR = path.join(OUT_DIR, 'rust-regex');
  fs.mkdirSync(RUST_REGEX_OUT_DIR, { recursive: true });

  // Tracks only the files THIS generator writes (never realistic-patterns.json,
  // hand-curated). If a category disappears or every one of
  // its cases gets excluded between runs, its old file would otherwise linger on disk and
  // corpus.test.ts would keep exercising stale, no-longer-generated data.
  const manifestFile = path.join(OUT_DIR, '.generated-manifest.json');
  const previousManifest = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
    : [];
  const currentManifest = [...byCategory.keys()].map((category) =>
    path.join(category === RUST_REGEX_MERGED_CATEGORY ? 'rust-regex' : '.', `${category}.json`),
  );
  for (const relPath of previousManifest) {
    if (!currentManifest.includes(relPath)) fs.rmSync(path.join(OUT_DIR, relPath), { force: true });
  }
  fs.writeFileSync(manifestFile, JSON.stringify(currentManifest) + '\n');

  for (const [category, cases] of byCategory) {
    // `input` can repeat heavily within a category (e.g. realistic cases cross-multiply
    // patterns against a handful of subjects) -- store distinct inputs once, referenced by index.
    const distinctInputs = [...new Set(cases.map((c) => c.input))];
    const useSubjectIndex = distinctInputs.length < cases.length;
    const inputIndex = useSubjectIndex ? new Map(distinctInputs.map((s, i) => [s, i])) : null;
    const cleaned = cases.map((c) => [
      c.pattern,
      c.flags,
      useSubjectIndex ? inputIndex.get(c.input) : c.input,
      c.validity === 'es-pcre2-agree' ? 1 : 0,
      packResult(c.realPcre2),
    ]);
    const output = useSubjectIndex ? { subjects: distinctInputs, cases: cleaned } : cleaned;
    const dir = category === RUST_REGEX_MERGED_CATEGORY ? RUST_REGEX_OUT_DIR : OUT_DIR;
    fs.writeFileSync(path.join(dir, `${category}.json`), JSON.stringify(output) + '\n');
  }
  fs.copyFileSync(
    path.join(ROOT, 'vendor/rust-regex/LICENSE-MIT'),
    path.join(RUST_REGEX_OUT_DIR, 'LICENSE-MIT'),
  );

  // category is kept here since this array mixes every category, unlike the per-category cases above.
  const dedupedDivergences = dedupBy(esDiverge, caseKey);
  const divergenceTuples = dedupedDivergences.map((c) => [
    c.tags?.[0] ?? c.category,
    c.pattern,
    c.flags,
    c.input,
    packResult(c.realPcre2),
    packResult(c.nativeResult),
  ]);

  // Divergences live alongside the curated/synthetic cases in one file (both are
  // hand-authored, neither sourced from PCRE2's own suite or rust-regex's) -- attached as
  // a sibling `divergences` key so corpus.test.ts's generic `.cases` loader still only sees
  // the must-match-native-RegExp cases; es-pcre2-divergences.test.ts reads `.divergences`.
  const curatedFile = path.join(OUT_DIR, 'curated-cases.json');
  const curated = JSON.parse(fs.readFileSync(curatedFile, 'utf8'));
  const curatedWithDivergences = Array.isArray(curated)
    ? { cases: curated, divergences: divergenceTuples }
    : { ...curated, divergences: divergenceTuples };
  fs.writeFileSync(curatedFile, JSON.stringify(curatedWithDivergences) + '\n');

  console.log(`es-pcre2-agree + pcre2-only (pass-required, test/pcre2-compatibility.test.ts): ${dedupedAgree.length} across ${byCategory.size} categories`);
  for (const [category, cases] of [...byCategory].sort()) {
    const agree = cases.filter((c) => c.validity === 'es-pcre2-agree').length;
    console.log(`  ${category}: ${cases.length} (${agree} es-pcre2-agree, ${cases.length - agree} pcre2-only)`);
  }
  console.log(`ES-vs-PCRE2 genuine divergences (documented, curated-cases.json's divergences key): ${dedupedDivergences.length}`);
  console.log(`Engine bugs (our engine disagrees with real PCRE2): ${engineBugs.length}`);
  for (const c of engineBugs) console.log(`  ${c.id}: /${c.pattern}/${c.flags} on ${JSON.stringify(c.input)}`);
  console.log(`Excluded (uncompilable by one or both): ${excluded.length}`);
  const byReason = new Map();
  for (const e of excluded) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
  for (const [reason, count] of byReason) console.log(`  ${reason}: ${count}`);

  // A probe that disagrees with real PCRE2 is a bug in our engine -- letting the command
  // exit 0 anyway would silently generate (and commit) a corpus with known-wrong cases
  // quietly excluded, rather than surfacing the regression.
  if (engineBugs.length > 0) {
    console.error(`\n${engineBugs.length} case(s) disagree with real PCRE2 -- see "Engine bugs" above.`);
    process.exitCode = 1;
  }

  // Collapse cases that only differ in literal content, not structural pattern shape/flags/
  // subject-shape/outcome-shape -- upstream suites carry heavy redundancy of this kind.
  // Scoped to files this generator owns; realistic-patterns.json stays hand-curated (see above).
  execSync(
    'node scripts/corpus/find-near-duplicates.mjs --write ' +
      '--targets=pcre2-testinput1.json,rust-regex/rust-regex-corpus.json,curated-cases.json',
    { cwd: ROOT, stdio: 'inherit' },
  );
}

main();
