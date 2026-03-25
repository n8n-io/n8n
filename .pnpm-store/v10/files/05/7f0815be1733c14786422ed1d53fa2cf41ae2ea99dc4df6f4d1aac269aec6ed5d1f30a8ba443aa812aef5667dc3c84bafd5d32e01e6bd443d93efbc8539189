// @ts-check

const { createBenchmark, createConnection } = require('../common');

const { Request, TYPES } = require('tedious');

const bench = createBenchmark(main, {
  n: [10, 100],
  size: [
    10,
    100,
    1000,
    10000
  ]
});

function main({ n, size }) {
  createConnection((connection) => {
    const request = new Request(`
      CREATE TABLE "#tmpTestTable" (
        "id" int NOT NULL
      )
    `, (err) => {
      if (err) {
        throw err;
      }

      let i = 0;

      bench.start();

      (function cb() {
        const bulkLoad = connection.newBulkLoad('#tmpTestTable', (err) => {
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

        bulkLoad.addColumn('id', TYPES.Int, { nullable: false });

        const rows = [];
        for (let j = 0; j < size; j++) {
          rows.push([ j ]);
        }
        connection.execBulkLoad(bulkLoad, rows);
      })();
    });

    connection.execSqlBatch(request);
  });
}
