//
//
//

// Different kind of credentials that can be supplied when opening a
// connection, corresponding to SASL mechanisms There's only two
// useful mechanisms that RabbitMQ implements:
//  * PLAIN (send username and password in the plain)
//  * EXTERNAL (assume the server will figure out who you are from
//    context, i.e., your SSL certificate)
var codec = require('./codec')

module.exports.plain = function(user, passwd) {
  return {
    mechanism: 'PLAIN',
    response: function() {
      return Buffer.from(['', user, passwd].join(String.fromCharCode(0)))
    },
    username: user,
    password: passwd
  }
}

module.exports.amqplain = function(user, passwd) {
  return {
    mechanism: 'AMQPLAIN',
    response: function() {
      const buffer = Buffer.alloc(16384);
      const size = codec.encodeTable(buffer, { LOGIN: user, PASSWORD: passwd}, 0);
      return buffer.subarray(4, size);
    },
    username: user,
    password: passwd
  }
}

module.exports.external = function() {
  return {
    mechanism: 'EXTERNAL',
    response: function() { return Buffer.from(''); }
  }
}
