const { createBenchmark } = require('../common');

const { Request, TYPES } = require('tedious');
const RpcRequestPayload = require('tedious/lib/rpcrequest-payload');

const { Readable } = require('stream');

const bench = createBenchmark(main, {
  n: [10, 100],
  size: [10, 100, 1000, 10000]
});

function main({ n, size }) {
  var table = {
    columns: [
      { name: 'user_id', type: TYPES.Int },
      { name: 'user_name', type: TYPES.VarChar, length: 500 },
      { name: 'user_enabled', type: TYPES.Bit }
    ],
    rows: []
  };

  for (let j = 0; j < size; j++) {
    table.rows.push([15, 'Eric', true]);
  }

  const request = new Request('...', () => {});
  request.addParameter('value', TYPES.TVP, table);
  request.validateParameters();

  let i = 0;
  bench.start();

  (function cb() {
    if (i++ === n) {
      bench.end(n);
      return;
    }

    const payload = new RpcRequestPayload(request.sqlTextOrProcedure, request.parameters, Buffer.alloc(0), {}, undefined);
    const stream = Readable.from(payload);
    stream.on('data', () => {});
    stream.on('end', cb);
  })();
}
