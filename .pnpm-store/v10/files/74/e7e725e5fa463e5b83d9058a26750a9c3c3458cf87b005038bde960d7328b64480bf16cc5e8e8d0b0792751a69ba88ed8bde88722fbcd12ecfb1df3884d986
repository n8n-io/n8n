const { createBenchmark } = require('../common');

const { Parser } = require('tedious/lib/token/token-stream-parser');

const bench = createBenchmark(main, {
  n: [10, 100, 1000],
  tokenCount: [10, 100, 1000, 10000]
});

async function * repeat(data, n) {
  for (let i = 0; i < n; i++) {
    yield data;
  }
}

function main({ n, tokenCount }) {
  const data = Buffer.from('FE0000E0000000000000000000'.repeat(tokenCount), 'hex');

  const parser = new Parser(repeat(data, n), { token: function() { } }, {
    onDoneProc: (token) => { }
  }, {});

  bench.start();

  parser.on('end', () => {
    bench.end(n);
  });
}
