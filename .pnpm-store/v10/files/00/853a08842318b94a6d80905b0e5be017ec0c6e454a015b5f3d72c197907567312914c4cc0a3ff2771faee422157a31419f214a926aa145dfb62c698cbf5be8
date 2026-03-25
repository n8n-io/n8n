const { createBenchmark, createConnection } = require('../common');

const { Request, TYPES } = require('tedious');

const bench = createBenchmark(main, {
  n: [10, 100, 1000],
  size: [10, 100, 1000, 10000]
});

function main({ n, size }) {
  createConnection(function(connection) {
    const request = new Request('CREATE TABLE #benchmark ([id] int IDENTITY(1,1), [name] nvarchar(100), [description] nvarchar(max))', (err) => {
      if (err) {
        throw err;
      }

      (function insertNext(num, done) {
        var request = new Request('INSERT INTO #benchmark ([name], [description]) VALUES (@name, @description)', (err) => {
          if (err) {
            throw err;
          }

          if (num === size) {
            done();
          } else {
            insertNext(num + 1, done);
          }
        });

        request.addParameter('name', TYPES.NVarChar, 'Row ' + n);
        request.addParameter('description', TYPES.NVarChar, 'Example Test Description for Row ' + n);

        connection.execSql(request);
      })(0, (err) => {
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
    });

    connection.execSqlBatch(request);
  });
}
