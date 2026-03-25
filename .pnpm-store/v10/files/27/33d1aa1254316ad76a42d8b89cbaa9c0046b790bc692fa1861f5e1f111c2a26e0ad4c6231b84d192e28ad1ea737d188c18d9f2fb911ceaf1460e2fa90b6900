var fs = require('fs');

module.exports = function (filepath, split, encoding) {
  split = typeof split !== 'undefined' ? split : "\n";
  encoding = typeof encoding !== 'undefined' ? encoding : "utf8";

  var ca = [];
  var chain = fs.readFileSync(filepath, encoding);
  if(chain.indexOf("-END CERTIFICATE-") < 0 || chain.indexOf("-BEGIN CERTIFICATE-") < 0){
    throw Error("File does not contain 'BEGIN CERTIFICATE' or 'END CERTIFICATE'");
  }
  chain = chain.split(split);
  var cert = [];
  var _i, _len;
  for (_i = 0, _len = chain.length; _i < _len; _i++) {
    var line = chain[_i];
    if (!(line.length !== 0)) {
      continue;
    }
    cert.push(line);
    if (line.match(/-END CERTIFICATE-/)) {
      ca.push(cert.join(split));
      cert = [];
    }
  }
  return ca;
}
