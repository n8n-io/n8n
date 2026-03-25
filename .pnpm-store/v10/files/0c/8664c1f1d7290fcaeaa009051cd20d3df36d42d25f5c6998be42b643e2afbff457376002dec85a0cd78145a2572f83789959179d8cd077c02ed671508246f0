var fs = require("fs"),
    decode = require("./decode");

module.exports = function(path, options, callback) {
  if (arguments.length < 3) callback = options, options = null;

  switch (path) {
    case "/dev/stdin": return readStream(process.stdin, options, callback);
  }

  fs.stat(path, function(error, stat) {
    if (error) return callback(error);
    if (stat.isFile()) return fs.readFile(path, options, callback);
    readStream(fs.createReadStream(path, options ? {flags: options.flag || "r"} : {}), options, callback); // N.B. flag / flags
  });
};

function readStream(stream, options, callback) {
  var decoder = decode(options);
  stream.on("error", callback);
  stream.on("data", function(d) { decoder.push(d); });
  stream.on("end", function() { callback(null, decoder.value()); });
}
