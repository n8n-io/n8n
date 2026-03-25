/*
 * mockserver
 * http://mock-server.com
 *
 * Copyright (c) 2014 James Bloom
 * Licensed under the Apache License, Version 2.0
 */
(function () {
    "use strict";

    if (module && require) {
        var WebSocketClient = require('websocket').client;
        var Q = require('q');
        var fs = require('fs');

        var defer = function () {
            var promise = (global.protractor && protractor.promise.USE_PROMISE_MANAGER !== false)
                ? protractor.promise
                : Q;
            var deferred = promise.defer();

            if (deferred.fulfill && !deferred.resolve) {
                deferred.resolve = deferred.fulfill;
            }
            return deferred;
        };

        var downloadCACert = function (tls, caCertPath, callback) {
            // https://raw.githubusercontent.com/mock-server/mockserver/master/mockserver-core/src/main/resources/org/mockserver/socket/CertificateAuthorityCertificate.pem

            var dest = "CertificateAuthorityCertificate.pem";
            if (!fs.existsSync('./' + dest)) {
                var options = {
                    protocol: 'https:',
                    method: 'GET',
                    host: "raw.githubusercontent.com",
                    path: "/mock-server/mockserver/master/mockserver-core/src/main/resources/org/mockserver/socket/CertificateAuthorityCertificate.pem",
                    port: 443,
                };
                var req = require('https').request(options);

                req.once('error', function (error) {
                    console.error('Fetching ' + JSON.stringify(options, null, 2) + ' failed with error ' + error);
                });

                req.once('response', function (res) {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        console.error('Fetching ' + JSON.stringify(options, null, 2) + ' failed with HTTP status code ' + res.statusCode);
                    } else {
                        var writeStream = fs.createWriteStream(dest);
                        res.pipe(writeStream);

                        writeStream.on('error', function (error) {
                            console.error('Saving ' + dest + ' failed with error ' + error);
                        });
                        writeStream.on('close', function () {
                            console.log('Saved ' + dest + ' from ' + JSON.stringify(options, null, 2));
                            callback(tls ? [fs.readFileSync(caCertPath || "./" + dest, {encoding: 'utf-8'})] : []);
                        });
                    }
                });

                req.end();
            } else {
                callback(tls ? [fs.readFileSync(caCertPath || "./" + dest, {encoding: 'utf-8'})] : []);
            }
        };

        var webSocketClient = function (tls, caCertPath) {
            return function (host, port, contextPath) {
                var deferred = defer();
                downloadCACert(tls, caCertPath, function (ca) {

                    var clientId;
                    var clientIdHandler;
                    var requestHandler;
                    var webSocketLocation = (tls ? "wss" : "ws") + "://" + host + ":" + port + contextPath + "/_mockserver_callback_websocket";

                    var client = new WebSocketClient({
                        maxReceivedFrameSize: 64 * 1024 * 1024,   // 64MiB
                        maxReceivedMessageSize: 64 * 1024 * 1024, // 64MiB
                        fragmentOutgoingMessages: false,
                        tlsOptions: {
                            ca: ca,
                            port: port
                        }
                    });

                    client.on('connectFailed', function (error) {
                        if (error.code && error.code === "ECONNREFUSED") {
                            deferred.reject("Can't connect to MockServer running on host: \"" + host + "\" and port: \"" + port + "\"");
                        } else {
                            deferred.reject(JSON.stringify(error));
                        }
                    });

                    client.on('connect', function (connection) {
                        connection.on('error', function (error) {
                            if (error.code && error.code === "ECONNREFUSED") {
                                deferred.reject("Can't connect to MockServer running on host: \"" + host + "\" and port: \"" + port + "\"");
                            } else {
                                deferred.reject(JSON.stringify(error));
                            }
                        });
                        connection.on('message', function (message) {
                            if (message.type === 'utf8') {
                                var payload = JSON.parse(message.utf8Data);
                                if (payload.type === "org.mockserver.model.HttpRequest") {
                                    var request = JSON.parse(payload.value);
                                    var response = requestHandler(request);
                                    connection.sendUTF(JSON.stringify(response));
                                } else if (payload.type === "org.mockserver.serialization.model.WebSocketClientIdDTO") {
                                    var registration = JSON.parse(payload.value);
                                    if (registration.clientId) {
                                        clientId = registration.clientId;
                                        if (clientIdHandler) {
                                            clientIdHandler(clientId);
                                        }
                                    }
                                }
                            } else {
                                console.log('Incorrect message format: ' + JSON.parse(message));
                            }
                        });
                    });

                    client.connect(webSocketLocation, []);

                    deferred.resolve({
                        requestCallback: function requestCallback(callback) {
                            requestHandler = callback;
                        },
                        clientIdCallback: function clientIdCallback(callback) {
                            clientIdHandler = callback;
                            if (clientId) {
                                clientIdHandler(clientId);
                            }
                        }
                    });
                });
                return deferred.promise;
            };
        };

        module.exports = {
            webSocketClient: webSocketClient
        };
    }
})();