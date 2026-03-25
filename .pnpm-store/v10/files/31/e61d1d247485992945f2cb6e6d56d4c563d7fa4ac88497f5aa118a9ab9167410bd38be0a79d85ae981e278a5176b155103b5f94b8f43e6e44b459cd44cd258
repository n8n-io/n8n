const { createBenchmark } = require('../common');

const { Request, TYPES } = require('tedious');
const RpcRequestPayload = require('tedious/lib/rpcrequest-payload');

const { Readable } = require('stream');

const bench = createBenchmark(main, {
  n: [10, 100],
  size: [
    1024 * 1024,
    10 * 1024 * 1024,
    50 * 1024 * 1024,
  ]
});

function main({ n, size }) {
  const buf = Buffer.alloc(size, 'x');

  const request = new Request('...', () => {});
  request.addParameter('value', TYPES.VarBinary, buf);

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
