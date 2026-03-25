var grpc = require("@grpc/grpc-js"),
  protoLoader = require("@grpc/proto-loader"),
  path = require("path"),
  uuid = require("uuid").v4;

function withSession(docker, auth, handler) {
  const sessionId = uuid();

  const opts = {
    method: "POST",
    path: "/session",
    hijack: true,
    headers: {
      Upgrade: "h2c",
      "X-Docker-Expose-Session-Uuid": sessionId,
      "X-Docker-Expose-Session-Name": "testcontainers",
    },
    statusCodes: {
      200: true,
      500: "server error",
    },
  };

  docker.modem.dial(opts, function (err, socket) {
    if (err) {
      return handler(err, null, () => undefined);
    }

    const server = new grpc.Server();
    const creds = grpc.ServerCredentials.createInsecure();
    const injector = server.createConnectionInjector(creds);
    injector.injectConnection(socket);

    const pkg = protoLoader.loadSync(
      path.resolve(__dirname, "proto", "auth.proto")
    );
    const service = grpc.loadPackageDefinition(pkg);

    server.addService(service.moby.filesync.v1.Auth.service, {
      Credentials({ request }, callback) {
        // We probably want to have the possibility to pass credentials per
        // hots. The correct one could be returned based on `request.Host`
        if (auth) {
          callback(null, {
            Username: auth.username,
            Secret: auth.password,
          });
        } else {
          callback(null, {});
        }
      },
    });

    function done() {
      server.forceShutdown();
      socket.end();
    }

    handler(null, sessionId, done);
  });
}

module.exports = withSession;
