const { createBenchmark, createConnection } = require('../common');

const { Request, TYPES } = require('tedious');

const bench = createBenchmark(main, {
  n: [10, 100]
});

function main({ n }) {
  createConnection(function(connection) {
    const request = new Request(`
      USE tempdb;

      DROP TYPE IF EXISTS TediousTestType;

      CREATE TYPE TediousTestType AS TABLE (
        FileId uniqueidentifier,
        FileNumber bigint,
        FileVersion varchar(20),
        FileCommitID varchar(40),
        FileModel nvarchar(max)
      );
    `, (err) => {
      if (err) {
        throw err;
      }

      const request = new Request(`
        CREATE PROCEDURE #__tediousTvpTest @tvp TediousTestType readonly AS BEGIN select COUNT(*) from @tvp END
      `, (err) => {
        if (err) {
          throw err;
        }

        const tvp = {
          columns: [
            {
              name: 'FileId',
              type: TYPES.UniqueIdentifier
            },
            {
              name: 'FileNumber',
              type: TYPES.BigInt
            },
            {
              name: 'FileVersion',
              type: TYPES.VarChar,
              length: 20,
            },
            {
              name: 'FileCommitID',
              type: TYPES.VarChar,
              length: 40,
            },
            {
              name: 'FileModel',
              type: TYPES.NVarChar,
              length: Infinity
            }
          ],
          rows: []
        };

        for (let i = 0; i < 500; i++) {
          tvp.rows.push([
            '6F9619FF-8B86-D011-B42D-00C04FC964FF',
            1,
            '12345',
            '6b8bd41619d843b35b13478bb8aa88ea67039a05',
            new Array(5000).join('x')
          ]);
        }

        let i = 0;
        bench.start();

        (function cb() {
          const request = new Request('#__tediousTvpTest', (err) => {
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

          request.addParameter('tvp', TYPES.TVP, tvp);

          connection.callProcedure(request);
        })();
      });

      connection.execSqlBatch(request);
    });

    connection.execSqlBatch(request);
  });
}
