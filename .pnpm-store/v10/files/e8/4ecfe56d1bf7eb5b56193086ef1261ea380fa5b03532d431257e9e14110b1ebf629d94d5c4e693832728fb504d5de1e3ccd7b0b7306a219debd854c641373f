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
  const data = Buffer.from('810300000000001000380269006400000000000900e7c8000904d00034046e0061006d006500000000000900e7ffff0904d000340b6400650073006300720069007000740069006f006e00'.repeat(tokenCount), 'hex');
  const parser = new Parser(repeat(data, n), { token: function() { } }, {
    onColMetadata: (token) => { }
  }, {});

  bench.start();

  parser.on('end', () => {
    bench.end(n);
  });
}
