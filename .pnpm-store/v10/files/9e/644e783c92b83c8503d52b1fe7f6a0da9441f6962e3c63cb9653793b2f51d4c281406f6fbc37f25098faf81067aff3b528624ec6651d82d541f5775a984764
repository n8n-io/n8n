'use strict';

function makeDoneCb(resolve, reject, localErr) {
  return function (err, rows, fields) {
    if (err) {
      localErr.message = err.message;
      localErr.code = err.code;
      localErr.errno = err.errno;
      localErr.sql = err.sql;
      localErr.sqlState = err.sqlState;
      localErr.sqlMessage = err.sqlMessage;
      reject(localErr);
    } else {
      resolve([rows, fields]);
    }
  };
}

module.exports = makeDoneCb;
