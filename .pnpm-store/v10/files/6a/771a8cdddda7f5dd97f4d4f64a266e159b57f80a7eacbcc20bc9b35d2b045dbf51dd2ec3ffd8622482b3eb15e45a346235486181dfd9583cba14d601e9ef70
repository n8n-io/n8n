var fs = require("fs"),
    encode = require("./encode");

module.exports = function(path, data, options, callback) {
  if (arguments.length < 4) callback = options, options = null;

  switch (path) {
    case "/dev/stdout": return writeStream(process.stdout, "write", data, options, callback);
    case "/dev/stderr": return writeStream(process.stderr, "write", data, options, callback);
  }

  fs.stat(path, function(error, stat) {
    if (error && error.code !== "ENOENT") return callback(error);
    if (stat && stat.isFile()) return fs.writeFile(path, data, options, callback);
    writeStream(fs.createWriteStream(path, options ? {flags: options.flag || "w"} : {}), "end", data, options, callback); // N.B. flag / flags
  });
};

function writeStream(stream, send, data, options, callback) {
  stream.on("error", function(error) { callback(error.code === "EPIPE" ? null : error); }); // ignore broken pipe, e.g., | head
  stream[send](encode(data, options), function(error) { callback(error && error.code === "EPIPE" ? null : error); });
}
