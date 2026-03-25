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
        var Q = require('q');
        var fs = require('fs');

        var defer = function () {
            var promise = (global.protractor && global.protractor.promise.USE_PROMISE_MANAGER !== false) ? global.protractor.promise : Q;
            var deferred = promise.defer();

            if (deferred.fulfill && !deferred.resolve) {
                deferred.resolve = deferred.fulfill;
            }
            return deferred;
        };

        var downloadCACert = function (tls, caCertPath, callback) {
            // https://raw.githubusercontent.com/mock-server/mockserver/master/mockserver-core/src/main/resources/org/mockserver/socket/CertificateAuthorityCertificate.pem

            var dest = "CertificateAuthorityCertificate.pem";
            if (tls && !caCertPath && !fs.existsSync('./' + dest)) {
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

        var sendRequest = function (tls, caCertPath) {
            var http = tls ? require('https') : require('http');
            return function (host, port, path, jsonBody, resolveCallback) {
                var deferred = defer();
                downloadCACert(tls, caCertPath, function (ca) {

                    var body = (typeof jsonBody === "string" ? jsonBody : JSON.stringify(jsonBody || ""));
                    var options = {
                        protocol: tls ? 'https:' : 'http:',
                        method: 'PUT',
                        host: host,
                        path: path,
                        port: port,
                        ca: ca,
                        headers: {
                            'Content-Type': "application/json; charset=utf-8"
                        },
                    };

                    var req = http.request(options);

                    req.once('response', function (response) {
                        var data = '';

                        response.on('data', function (chunk) {
                            data += chunk;
                        });

                        response.on('end', function () {
                            if (resolveCallback) {
                                deferred.resolve(resolveCallback(data));
                            } else {
                                if (response.statusCode >= 400 && response.statusCode < 600) {
                                    if (response.statusCode === 404) {
                                        deferred.reject("404 Not Found");
                                    } else {
                                        deferred.reject(data);
                                    }
                                } else {
                                    deferred.resolve({
                                        statusCode: response.statusCode,
                                        body: data
                                    });
                                }
                            }
                        });
                    });

                    req.once('error', function (error) {
                        if (error.code && error.code === "ECONNREFUSED") {
                            deferred.reject("Can't connect to MockServer running on host: \"" + host + "\" and port: \"" + port + "\"");
                        } else {
                            deferred.reject(JSON.stringify(error));
                        }
                    });

                    req.write(body);
                    req.end();

                });
                return deferred.promise;
            };
        };

        module.exports = {
            sendRequest: sendRequest
        };
    }
})();