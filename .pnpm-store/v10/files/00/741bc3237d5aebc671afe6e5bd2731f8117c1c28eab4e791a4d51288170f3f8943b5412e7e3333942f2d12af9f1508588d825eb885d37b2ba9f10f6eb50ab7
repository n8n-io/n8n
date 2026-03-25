const { createBenchmark, createConnection } = require('../common');

const { Request, TYPES } = require('tedious');

const bench = createBenchmark(main, {
  n: [10, 100, 1000],
  size: [10, 100, 1000, 10000]
});

function main({ n, size }) {
  createConnection(function(connection) {
    const request = new Request('CREATE TABLE #benchmark ([value] nvarchar(max))', (err) => {
      if (err) {
        throw err;
      }

      var request = new Request('INSERT INTO #benchmark ([value]) VALUES (@value)', (err) => {
        let i = 0;

        bench.start();

        (function cb() {
          const request = new Request('SELECT * FROM #benchmark', (err) => {
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

          connection.execSql(request);
        })();
      });

      const value = 'a'.repeat(size);
      request.addParameter('value', TYPES.NVarChar, value);
      connection.execSql(request);
    });

    connection.execSqlBatch(request);
  });
}
