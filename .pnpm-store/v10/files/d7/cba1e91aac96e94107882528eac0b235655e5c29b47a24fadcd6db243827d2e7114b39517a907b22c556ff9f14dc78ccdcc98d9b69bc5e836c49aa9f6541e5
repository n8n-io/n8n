// Example of using a TLS/SSL connection. Note that the server must be
// configured to accept SSL connections; see, for example,
// http://www.rabbitmq.com/ssl.html.
//
// When trying this out, I followed the RabbitMQ SSL guide above,
// almost verbatim. I set the CN of the server certificate to
// 'localhost' rather than $(hostname) (since on my MBP hostname ends
// up being "<blah>.local", which is just weird). My client
// certificates etc., are in `../etc/client/`. My testca certificate
// is in `../etc/testca` and server certs etc., in `../etc/server`,
// and I've made a `rabbitmq.config` file, with which I start
// RabbitMQ:
//
//     RABBITMQ_CONFIG_FILE=`pwd`/../etc/server/rabbitmq \
//       /usr/local/sbin/rabbitmq-server &
//
// A way to check RabbitMQ's running with SSL OK is to use
//
//     openssl s_client -connect localhost:5671

const amqp = require('../');
const fs = require('fs');

// Assemble the SSL options; for verification we need at least
// * a certificate to present to the server ('cert', in PEM format)
// * the private key for the certificate ('key', in PEM format)
// * (possibly) a passphrase for the private key
//
// The first two may be replaced with a PKCS12 file ('pfx', in pkcs12
// format)

// We will also want to list the CA certificates that we will trust,
// since we're using a self-signed certificate. It is NOT recommended
// to use `rejectUnauthorized: false`.

// Options for full client and server verification:
const opts = {
  cert: fs.readFileSync('../etc/client/cert.pem'),
  key: fs.readFileSync('../etc/client/key.pem'),
  // cert and key or
  // pfx: fs.readFileSync('../etc/client/keycert.p12'),
  passphrase: 'MySecretPassword',
  ca: [fs.readFileSync('../etc/testca/cacert.pem')]
};

// Options for just confidentiality. This requires RabbitMQ's SSL
// configuration to include the items
//
//     {verify, verify_none},
//     {fail_if_no_peer_cert,false}
//
// const opts = {  ca: [fs.readFileSync('../etc/testca/cacert.pem')] };

// Option to use the SSL client certificate for authentication
// opts.credentials = amqp.credentials.external();

(async () => {
  const connection = await amqp.connect('amqp://localhost', opts);
  const channel = await connection.createChannel();

  process.on('SIGINT', async () => {
    await channel.close();
    await connection.close();
  });

  channel.sendToQueue('foo', Buffer.from('Hello World!'));

  console.log(' [x] To exit press CTRL+C.');
})();

