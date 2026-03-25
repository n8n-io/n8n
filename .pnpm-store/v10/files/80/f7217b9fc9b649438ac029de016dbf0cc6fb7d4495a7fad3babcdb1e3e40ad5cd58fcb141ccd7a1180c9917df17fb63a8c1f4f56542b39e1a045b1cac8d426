'use strict';
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const { red, green, yellow, cyan, grey } = require('./colors');
const { sampleModule } = require('./fork');
const NS_PER_SEC = 1e9;
const LOCAL = 'local';

// The maximum time in seconds a benchmark is allowed to run before finishing.
const maxTime = 10;
// The minimum sample size required to perform statistical analysis.
const minSamples = 5;

function LOCAL_DIR(...paths) {
  return path.join(__dirname, '..', ...paths);
}

// Build a benchmark-friendly environment for the given revision
// and returns path to its 'lib' directory.
function prepareRevision(revision) {
  console.log(`🍳  Preparing ${revision}...`);

  if (revision === LOCAL) {
    return tscBuild(path.join(LOCAL_DIR(), '../../..'));
  }

  // Returns the complete git hash for a given git revision reference.
  const hash = exec(`git rev-parse "${revision}"`);
  const dir = path.join(os.tmpdir(), 'redocly-cli-benchmark', hash);
  if (fs.existsSync(dir)) {
    fs.rmdirSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });

  exec(`git archive "${hash}" | tar -xC "${dir}"`);
  exec('npm ci', { cwd: dir });
  const to = path.join(dir, 'packages/core/src/benchmark/benches');
  exec(`rm -rf ${to}`);
  exec(`cp -R ${LOCAL_DIR('benchmark/benches')} ${to}`);
  return tscBuild(dir);
}

function tscBuild(dir) {
  const oldCwd = process.cwd();
  process.chdir(dir);
  execSync('npm run compile', { stdio: 'inherit' });
  exec(
    `cp ${path.join(dir, 'packages/core/src/benchmark/benches/*.yaml')} ${path.join(
      dir,
      'packages/core/lib/benchmark/benches/'
    )}`
  );
  process.chdir(oldCwd);
  return path.join(dir, 'packages/core/lib/benchmark/benches');
}

async function collectSamples(modulePath) {
  const samples = [];

  // If time permits, increase sample size to reduce the margin of error.
  const start = Date.now();
  while (samples.length < minSamples || (Date.now() - start) / 1e3 < maxTime) {
    const { clocked, memUsed } = await sampleModule(modulePath);
    assert(clocked > 0);
    assert(memUsed > 0);
    samples.push({ clocked, memUsed });
  }
  return samples;
}

// T-Distribution two-tailed critical values for 95% confidence.
// See http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm.
const tTable =
  /* prettier-ignore */ {
  '1':  12.706, '2':  4.303, '3':  3.182, '4':  2.776, '5':  2.571, '6':  2.447,
  '7':  2.365,  '8':  2.306, '9':  2.262, '10': 2.228, '11': 2.201, '12': 2.179,
  '13': 2.16,   '14': 2.145, '15': 2.131, '16': 2.12,  '17': 2.11,  '18': 2.101,
  '19': 2.093,  '20': 2.086, '21': 2.08,  '22': 2.074, '23': 2.069, '24': 2.064,
  '25': 2.06,   '26': 2.056, '27': 2.052, '28': 2.048, '29': 2.045, '30': 2.042,
  infinity: 1.96,
};

// Computes stats on benchmark results.
function computeStats(samples) {
  assert(samples.length > 1);

  // Compute the sample mean (estimate of the population mean).
  let mean = 0;
  let meanMemUsed = 0;
  for (const { clocked, memUsed } of samples) {
    mean += clocked;
    meanMemUsed += memUsed;
  }
  mean /= samples.length;
  meanMemUsed /= samples.length;

  // Compute the sample variance (estimate of the population variance).
  let variance = 0;
  for (const { clocked } of samples) {
    variance += (clocked - mean) ** 2;
  }
  variance /= samples.length - 1;

  // Compute the sample standard deviation (estimate of the population standard deviation).
  const sd = Math.sqrt(variance);

  // Compute the standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean).
  const sem = sd / Math.sqrt(samples.length);

  // Compute the degrees of freedom.
  const df = samples.length - 1;

  // Compute the critical value.
  const critical = tTable[df] || tTable.infinity;

  // Compute the margin of error.
  const moe = sem * critical;

  // The relative margin of error (expressed as a percentage of the mean).
  const rme = (moe / mean) * 100 || 0;

  return {
    memPerOp: Math.floor(meanMemUsed),
    ops: NS_PER_SEC / mean,
    deviation: rme,
    numSamples: samples.length,
  };
}

function beautifyBenchmark(results) {
  const nameMaxLen = maxBy(results, ({ name }) => name.length);
  const opsTop = maxBy(results, ({ ops }) => ops);
  const opsMaxLen = maxBy(results, ({ ops }) => beautifyNumber(ops).length);
  const memPerOpMaxLen = maxBy(results, ({ memPerOp }) => beautifyBytes(memPerOp).length);

  for (const result of results) {
    printBench(result);
  }

  function printBench(bench) {
    const { name, memPerOp, ops, deviation, numSamples } = bench;
    console.log(
      '  ' +
        nameStr() +
        grey(' x ') +
        opsStr() +
        ' ops/sec ' +
        grey('\xb1') +
        deviationStr() +
        cyan('%') +
        grey(' x ') +
        memPerOpStr() +
        '/op' +
        grey(' (' + numSamples + ' runs sampled)')
    );

    function nameStr() {
      const nameFmt = name.padEnd(nameMaxLen);
      return ops === opsTop ? green(nameFmt) : nameFmt;
    }

    function opsStr() {
      const percent = ops / opsTop;
      const colorFn = percent > 0.95 ? green : percent > 0.8 ? yellow : red;
      return colorFn(beautifyNumber(ops).padStart(opsMaxLen));
    }

    function deviationStr() {
      const colorFn = deviation > 5 ? red : deviation > 2 ? yellow : green;
      return colorFn(deviation.toFixed(2));
    }

    function memPerOpStr() {
      return beautifyBytes(memPerOp).padStart(memPerOpMaxLen);
    }
  }
}

function beautifyBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log2(bytes) / 10);
  return beautifyNumber(bytes / 2 ** (i * 10)) + ' ' + sizes[i];
}

function beautifyNumber(num) {
  return Number(num.toFixed(num > 100 ? 0 : 2)).toLocaleString();
}

function maxBy(array, fn) {
  return Math.max(...array.map(fn));
}

// Prepare all revisions and run benchmarks matching a pattern against them.
async function prepareAndRunBenchmarks(benchmarkPatterns, revisions) {
  const environments = revisions.map((revision) => ({
    revision,
    distPath: prepareRevision(revision),
  }));

  console.log(`🚀  Starting benchmarks...`);

  for (const benchmark of matchBenchmarks(benchmarkPatterns)) {
    const results = [];
    for (let i = 0; i < environments.length; ++i) {
      const environment = environments[i];
      const modulePath = path.join(environment.distPath, benchmark);

      if (i === 0) {
        const { name } = await sampleModule(modulePath);
        console.log('⏱️   ' + name);
      }

      try {
        const samples = await collectSamples(modulePath);

        results.push({
          name: environment.revision,
          samples,
          ...computeStats(samples),
        });
        process.stdout.write('  ' + cyan(i + 1) + ' tests completed.\u000D');
      } catch (error) {
        console.log('  ' + environment.revision + ': ' + red(String(error)));
      }
    }
    console.log('\n');

    beautifyBenchmark(results);
    console.log('');
  }
}

function findFiles(cwd, pattern) {
  const out = exec(`find . -path '${pattern}'`, { cwd });
  return out.split('\n').filter(Boolean);
}

function removeTrailingNewLine(str) {
  if (str == null) {
    return str;
  }
  return str.split('\n').slice(0, -1).join('\n');
}

function exec(command, options) {
  const output = execSync(command, {
    maxBuffer: 10 * 1024 * 1024, // 10MB
    encoding: 'utf-8',
    ...options,
  });
  return removeTrailingNewLine(output);
}

// Find all benchmark tests to be run.
function matchBenchmarks(patterns) {
  let benchmarks = findFiles(LOCAL_DIR('../lib/benchmark/benches'), '*.bench.js');
  if (patterns.length > 0) {
    benchmarks = benchmarks.filter((benchmark) =>
      patterns.some((pattern) => path.join('../lib/benchmark/benches', benchmark).includes(pattern))
    );
  }

  if (benchmarks.length === 0) {
    console.warn('No benchmarks matching: ' + patterns.map(bold).join(''));
  }

  return benchmarks;
}

function getArguments(argv) {
  const revsIdx = argv.indexOf('--revs');
  const revsArgs = revsIdx === -1 ? [] : argv.slice(revsIdx + 1);
  const benchmarkPatterns = revsIdx === -1 ? argv : argv.slice(0, revsIdx);
  let assumeArgs;
  let revisions;
  switch (revsArgs.length) {
    case 0:
      assumeArgs = [...benchmarkPatterns, '--revs', 'local', 'HEAD'];
      revisions = [LOCAL, 'HEAD'];
      break;
    case 1:
      if (revsArgs[0] === LOCAL) {
        assumeArgs = [...benchmarkPatterns, '--revs', revsArgs[0]];
        revisions = [revsArgs[0]];
      } else {
        assumeArgs = [...benchmarkPatterns, '--revs', 'local', revsArgs[0]];
        revisions = [LOCAL, revsArgs[0]];
      }
      break;
    default:
      revisions = revsArgs;
      break;
  }
  if (assumeArgs) {
    console.warn('Assuming you meant: ' + bold('benchmark ' + assumeArgs.join(' ')));
  }
  return { benchmarkPatterns, revisions };
}

function bold(str) {
  return '\u001b[1m' + str + '\u001b[0m';
}

// Get the revisions and make things happen!
if (require.main === module) {
  const { benchmarkPatterns, revisions } = getArguments(process.argv.slice(2));
  prepareAndRunBenchmarks(benchmarkPatterns, revisions);
}
