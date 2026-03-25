const { createBenchmark, createConnection } = require('../common');

const bench = createBenchmark(main, {
  n: [10, 100]
});

function main({ n }) {
  let i = 0;
  bench.start();

  (function cb() {
    createConnection(function(connection) {
      connection.close();

      if (i++ === n) {
        bench.end(n);

        connection.close();

        return;
      }

      cb();
    });
  })();
}
