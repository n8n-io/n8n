const { createBenchmark, createConnection } = require('../common');

const { Request, TYPES } = require('tedious');

const bench = createBenchmark(main, {
  n: [10, 100],
  size: [
    10,
    1024,
    1024 * 1024,
    10 * 1024 * 1024
  ]
});

function main({ n, size }) {
  createConnection(function(connection) {
    const buf = Buffer.alloc(size);
    buf.fill('x');

    let i = 0;

    bench.start();

    (function cb() {
      const request = new Request('SELECT DATALENGTH(@value)', (err) => {
        if (err) {
          throw err;
        }

        if (i++ === n) {
          bench.end(n);

          connection.close();

          return;
        }

        cb();
      });

      request.addParameter('value', TYPES.VarBinary, buf);

      connection.execSql(request);
    })();
  });
}
