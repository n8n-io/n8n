var Client = require('ssh2').Client,
  http = require('http');

module.exports = function (opt) {
  var conn = new Client();
  var agent = new http.Agent();

  agent.createConnection = function (options, fn) {
    try {
      conn.once('ready', function () {
        conn.exec('docker system dial-stdio', function (err, stream) {
          if (err) {
            handleError(err , fn);
          }

          fn(null, stream);
          
          stream.addListener('error', (err) => {
            handleError(err, fn);
          });
          stream.once('close', () => {
            conn.end();
            agent.destroy();
          });
        });
      }).on('error', (err) => {
        handleError(err, fn);
      })
        .connect(opt);
      conn.once('end', () => agent.destroy());
      
    } catch (err) {
      handleError(err);
    }
  };

  function handleError(err, cb) {
    conn.end();
    agent.destroy();
    if (cb) {
      cb(err);
    } else {
      throw err;
    }
  }

  return agent;
};
