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
const RUST_REGEX_CATEGORIES = new Set(RUST_REGEX_FILES.map(([, category]) => category));

function loadRustRegexCases() {
  const cases = [];
  for (const [file, category] of RUST_REGEX_FILES) {
    const text = fs.readFileSync(path.join(RUST_REGEX_DIR, file), 'utf8');
    const blocks = parseTestToml(text);
    cases.push(...normalizeRustRegexBlocks(blocks, category));
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
  return { matched: true, whole: m[0], groups: m.slice(1) };
}

function resultsEqual(a, b) {
  if (!a || !b) return a === b;
  if (!a.matched || !b.matched) return a.matched === b.matched;
  if (a.whole !== b.whole) return false;
  if (a.groups.length !== b.groups.length) return false;
  return a.groups.every((v, i) => v === b.groups[i]);
}

function runOurEngine(engine, c) {
  let ourProbeFailed = false;
  try {
    const r = engine.exec(c.pattern, c.input, c.flags);
    return { result: r === null ? { matched: false } : { matched: true, whole: r[0], groups: r.slice(1) } };
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
    const dir = RUST_REGEX_CATEGORIES.has(category) ? RUST_REGEX_OUT_DIR : OUT_DIR;
    fs.writeFileSync(path.join(dir, `${category}.json`), JSON.stringify(output) + '\n');
  }
  fs.copyFileSync(
    path.join(ROOT, 'vendor/rust-regex/LICENSE-MIT'),
    path.join(RUST_REGEX_OUT_DIR, 'LICENSE-MIT'),
  );

  // category is kept here since this file mixes every category, unlike the per-category files above.
  const dedupedDivergences = dedupBy(esDiverge, caseKey);
  fs.writeFileSync(
    path.join(OUT_DIR, 'es-pcre2-divergences.json'),
    JSON.stringify(
      dedupedDivergences.map((c) => [
        c.category,
        c.pattern,
        c.flags,
        c.input,
        packResult(c.realPcre2),
        packResult(c.nativeResult),
      ]),
    ) + '\n',
  );

  console.log(`es-pcre2-agree + pcre2-only (pass-required, test/pcre2-compatibility/corpus.test.ts): ${dedupedAgree.length} across ${byCategory.size} categories`);
  for (const [category, cases] of [...byCategory].sort()) {
    const agree = cases.filter((c) => c.validity === 'es-pcre2-agree').length;
    console.log(`  ${category}: ${cases.length} (${agree} es-pcre2-agree, ${cases.length - agree} pcre2-only)`);
  }
  console.log(`ES-vs-PCRE2 genuine divergences (documented, es-pcre2-divergences.json): ${dedupedDivergences.length}`);
  console.log(`Engine bugs (our engine disagrees with real PCRE2): ${engineBugs.length}`);
  for (const c of engineBugs) console.log(`  ${c.id}: /${c.pattern}/${c.flags} on ${JSON.stringify(c.input)}`);
  console.log(`Excluded (uncompilable by one or both): ${excluded.length}`);
  const byReason = new Map();
  for (const e of excluded) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
  for (const [reason, count] of byReason) console.log(`  ${reason}: ${count}`);
}

main();
