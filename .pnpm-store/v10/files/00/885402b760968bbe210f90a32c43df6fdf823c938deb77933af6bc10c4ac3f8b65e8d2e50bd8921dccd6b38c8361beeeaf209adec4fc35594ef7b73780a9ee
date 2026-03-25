/*
 * mockserver
 * http://mock-server.com
 *
 * Copyright (c) 2014 James Bloom
 * Licensed under the Apache License, Version 2.0
 */
var mockServerClient;

(function () {
    "use strict";

    /**
     * Start the client communicating at the specified host and port
     *, for example:
     *
     *   var client = mockServerClient("localhost", 1080);
     *
     * @param host the host for the server to communicate with
     * @param port the port for the server to communicate with
     * @param contextPath the context path if server was deployed as a war i.e. '/myContextPath'
     * @param tls enable TLS (i.e. HTTPS) for communication to server
     * @param caCertPemFilePath provide custom CA Certificate (defaults to MockServer CA Certificate)
     */
    mockServerClient = function (host, port, contextPath, tls, caCertPemFilePath) {

        var runningInNode = function () {
            return (typeof require !== 'undefined') && require('browser-or-node').isNode;
        };

        var makeRequest = (runningInNode() ? require('./sendRequest').sendRequest(tls, caCertPemFilePath) : function (host, port, path, jsonBody) {
            var body = (typeof jsonBody === "string" ? jsonBody : JSON.stringify(jsonBody || ""));
            var url = (tls ? 'https' : 'http') + '://' + host + ':' + port + (contextPath ? (contextPath.indexOf("/") === 0 ? contextPath : "/" + contextPath) : "") + path;

            return {
                then: function (sucess, error) {
                    try {
                        var xmlhttp = new XMLHttpRequest();
                        xmlhttp.addEventListener("load", (function (sucess, error) {
                            return function () {
                                if (error && this.status >= 400 && this.status < 600) {
                                    if (this.statusCode === 404) {
                                        error("404 Not Found");
                                    } else {
                                        error(this.responseText);
                                    }
                                } else {
                                    if (sucess) {
                                        sucess({
                                            statusCode: this.status,
                                            body: this.responseText
                                        });
                                    }
                                }
                            };
                        })(sucess, error));
                        xmlhttp.open('PUT', url);
                        xmlhttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
                        xmlhttp.send(body);
                    } catch (e) {
                        if (error) {
                            error(e);
                        }
                    }
                }
            };
        });

        var cleanedContextPath = (function (contextPath) {
            if (contextPath) {
                if (!contextPath.endsWith("/")) {
                    contextPath += "/";
                }
                if (!contextPath.startsWith("/")) {
                    contextPath = "/" + contextPath;
                }
                return contextPath;
            } else {
                return '';
            }
        })(contextPath);

        /**
         * The default headers added to to the mocked response when using mockSimpleResponse(...)
         */
        var defaultResponseHeaders;
        var defaultRequestHeaders;

        var headersUniqueConcatenate = function (arrayTarget, arraySource) {
            if (!arrayTarget) {
                arrayTarget = arraySource;
            } else if (Array.isArray(arrayTarget) && Array.isArray(arraySource)) {
                if (arraySource && arraySource.length) {
                    if (arrayTarget && arrayTarget.length) {
                        for (var i = 0; i < arraySource.length; i++) {
                            var arrayTargetAlreadyHasValue = false;
                            for (var j = 0; j < arrayTarget.length; j++) {
                                if (JSON.stringify(arraySource[i]) === JSON.stringify(arrayTarget[j])) {
                                    arrayTargetAlreadyHasValue = true;
                                }
                            }
                            if (!arrayTargetAlreadyHasValue) {
                                arrayTarget.push(arraySource[i]);
                            }
                        }
                    } else {
                        arrayTarget = arraySource;
                    }
                }
            } else if (!Array.isArray(arrayTarget) && Array.isArray(arraySource)) {
                arraySource.forEach(function (entry) {
                    arrayTarget[entry["name"]] = entry["values"];
                });
            } else if (Array.isArray(arrayTarget) && !Array.isArray(arraySource)) {
                for (var property in arraySource) {
                    if (arraySource.hasOwnProperty(property)) {
                        arrayTarget.push({"name": property, "values": arraySource[property]});
                    }
                }
            } else if (!Array.isArray(arrayTarget) && !Array.isArray(arraySource)) {
                arrayTarget = Object.assign(arrayTarget, arraySource);
            }
            return arrayTarget;
        };
        var createRequestMatcher = function (path) {
            return {
                method: "",
                path: path,
                body: "",
                headers: defaultRequestHeaders,
                cookies: [],
                queryStringParameters: []
            };

        };
        var createExpectation = function (path, responseBody, statusCode) {
            return {
                httpRequest: createRequestMatcher(path),
                httpResponse: {
                    statusCode: statusCode || 200,
                    body: JSON.stringify(responseBody),
                    cookies: [],
                    headers: defaultResponseHeaders,
                    delay: {
                        timeUnit: "MICROSECONDS",
                        value: 0
                    }
                },
                times: {
                    remainingTimes: 1,
                    unlimited: false
                }
            };
        };
        var createExpectationWithCallback = function (requestMatcher, clientId, times, priority, timeToLive, id) {
            var timesObject;
            if (typeof times === 'number') {
                timesObject = {
                    remainingTimes: times,
                    unlimited: false
                };
            } else if (typeof times === 'object') {
                timesObject = times;
            }
            requestMatcher.headers = headersUniqueConcatenate(requestMatcher.headers, defaultRequestHeaders);
            return {
                id: typeof id === 'string' ? id : undefined,
                priority: typeof priority === 'number' ? priority : undefined,
                httpRequest: requestMatcher,
                httpResponseObjectCallback: {
                    clientId: clientId
                },
                times: timesObject || {
                    remainingTimes: 1,
                    unlimited: false
                },
                timeToLive: typeof timeToLive === 'object' ? timeToLive : {
                    unlimited: true
                }
            };
        };

        var WebSocketClient = (runningInNode() ? require('./webSocketClient').webSocketClient(tls, caCertPemFilePath) : function (host, port, contextPath) {
            var clientId;
            var clientIdHandler;
            var requestHandler;
            var browserWebSocket;

            return {
                then: function (sucess, error) {
                    try {
                        if (typeof (window) !== "undefined") {
                            if (window.WebSocket) {
                                browserWebSocket = window.WebSocket;
                            } else if (window.MozWebSocket) {
                                browserWebSocket = window.MozWebSocket;
                            } else {
                                error("Your browser does not support web sockets.");
                            }
                        }

                        if (browserWebSocket) {
                            var webSocketLocation = (tls ? "wss" : "ws") + "://" + host + ":" + port + contextPath + "/_mockserver_callback_websocket";

                            var socket = new WebSocket(webSocketLocation);
                            socket.onmessage = function (event) {
                                var message = JSON.parse(event.data);
                                if (message.type === "org.mockserver.model.HttpRequest") {
                                    var request = JSON.parse(message.value);
                                    var response = requestHandler(request);
                                    if (socket.readyState === WebSocket.OPEN) {
                                        socket.send(JSON.stringify(response));
                                    } else {
                                        throw "The socket is not open.";
                                    }
                                } else if (message.type === "org.mockserver.serialization.model.WebSocketClientIdDTO") {
                                    var registration = JSON.parse(message.value);
                                    if (registration.clientId) {
                                        clientId = registration.clientId;
                                        if (clientIdHandler) {
                                            clientIdHandler(clientId);
                                        }
                                    }
                                }
                            };
                            socket.onopen = function (event) {
                            };
                            socket.onclose = function (event) {
                            };
                        }

                        sucess({
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
                    } catch (e) {
                        if (error) {
                            error(e);
                        }
                    }
                }
            };
        });


        /**
         * Override:
         *
         * - default headers that are used to specify the response headers in mockSimpleResponse(...)
         *   (note: if you use mockAnyResponse(...) the default headers are not used)
         *
         * - headers added to every request matcher, this is particularly useful for running tests in parallel
         *
         *, for example:
         *
         *   client.setDefaultHeaders([
         *       {"name": "Content-Type", "values": ["application/json; charset=utf-8"]},
         *       {"name": "Cache-Control", "values": ["no-cache, no-store"]}
         *   ],[
         *       {"name": "sessionId", "values": ["786fcf9b-606e-605f-181d-c245b55e5eac"]}
         *   ])
         *
         * @param responseHeaders the default headers to be added to every response
         * @param requestHeaders the default headers to be added to every request matcher
         */
        var setDefaultHeaders = function (responseHeaders, requestHeaders) {
            if (responseHeaders) {
                defaultResponseHeaders = responseHeaders;
            }
            if (requestHeaders) {
                defaultRequestHeaders = requestHeaders;
            }
            return _this;
        };

        var addDefaultRequestMatcherHeaders = function (pathOrRequestMatcher) {
            var requestMatcher;
            if (typeof pathOrRequestMatcher === "string") {
                requestMatcher = {
                    path: pathOrRequestMatcher
                };
            } else if (typeof pathOrRequestMatcher === "object") {
                requestMatcher = pathOrRequestMatcher;
            } else {
                requestMatcher = {};
            }
            if (defaultRequestHeaders) {
                if (requestMatcher.httpRequest) {
                    requestMatcher.httpRequest.headers = headersUniqueConcatenate(requestMatcher.httpRequest.headers, defaultRequestHeaders);
                } else {
                    requestMatcher.headers = headersUniqueConcatenate(requestMatcher.headers, defaultRequestHeaders);
                }
            }
            return requestMatcher;
        };
        var addDefaultResponseMatcherHeaders = function (response) {
            var responseMatcher;
            if (typeof response === "object") {
                responseMatcher = response;
            } else {
                responseMatcher = {};
            }
            if (defaultResponseHeaders) {
                if (responseMatcher.httpResponse) {
                    responseMatcher.httpResponse.headers = headersUniqueConcatenate(responseMatcher.httpResponse.headers, defaultResponseHeaders);
                } else {
                    responseMatcher.headers = headersUniqueConcatenate(responseMatcher.headers, defaultResponseHeaders);
                }
            }
            return responseMatcher;
        };
        var addDefaultExpectationHeaders = function (expectation) {
            if (Array.isArray(expectation)) {
                for (var i = 0; i < expectation.length; i++) {
                    expectation[i].httpRequest = addDefaultRequestMatcherHeaders(expectation[i].httpRequest);
                    if (!expectation[i].httpResponseTemplate && !expectation[i].httpResponseClassCallback && !expectation[i].httpResponseObjectCallback && !expectation[i].httpForward && !expectation[i].httpForwardTemplate && !expectation[i].httpForwardClassCallback && !expectation[i].httpForwardObjectCallback && !expectation[i].httpOverrideForwardedRequest && !expectation[i].httpError) {
                        expectation[i].httpResponse = addDefaultResponseMatcherHeaders(expectation[i].httpResponse);
                    }
                }
            } else {
                expectation.httpRequest = addDefaultRequestMatcherHeaders(expectation.httpRequest);
                if (!expectation.httpResponseTemplate && !expectation.httpResponseClassCallback && !expectation.httpResponseObjectCallback && !expectation.httpForward && !expectation.httpForwardTemplate && !expectation.httpForwardClassCallback && !expectation.httpForwardObjectCallback && !expectation.httpOverrideForwardedRequest && !expectation.httpError) {
                    expectation.httpResponse = addDefaultResponseMatcherHeaders(expectation.httpResponse);
                }
            }
            return expectation;
        };
        /**
         * Setup an expectation by specifying an expectation object
         *, for example:
         *
         *   client.mockAnyResponse(
         *       {
         *           'httpRequest': {
         *               'path': '/somePath',
         *               'body': {
         *                   'type': "STRING",
         *                   'value': 'someBody'
         *               }
         *           },
         *           'httpResponse': {
         *               'statusCode': 200,
         *               'body': Base64.encode(JSON.stringify({ name: 'first_body' })),
         *               'delay': {
         *                   'timeUnit': 'MILLISECONDS',
         *                   'value': 250
         *               }
         *           },
         *           'times': {
         *               'remainingTimes': 1,
         *               'unlimited': false
         *           }
         *       }
         *   );
         *
         * @param expectation the expectation to setup on the MockServer
         */
        var mockAnyResponse = function (expectation) {
            return makeRequest(host, port, "/mockserver/expectation", addDefaultExpectationHeaders(expectation));
        };
        /**
         * Setup an expectation by specifying an OpenAPI expectation
         *, for example:
         *
         *   client.openAPIExpectation(
         *       {
         *           "specUrlOrPayload": "https://raw.githubusercontent.com/mock-server/mockserver/master/mockserver-integration-testing/src/main/resources/org/mockserver/openapi/openapi_petstore_example.json",
         *           "operationsAndResponses": {
         *               "showPetById": "200",
         *               "createPets": "500"
         *           }
         *       }
         *   );
         *
         * @param expectation the OpenAPI expectation to setup on the MockServer
         */
        var openAPIExpectation = function (expectation) {
            return makeRequest(host, port, "/mockserver/openapi", expectation);
        };
        /**
         * Setup an expectation by specifying a request matcher, and
         * a local request handler function.  The request handler function receives each
         * request (that matches the request matcher) and returns the response that will be returned for this expectation.
         *
         *, for example:
         *
         *    client.mockWithCallback(
         *            {
         *                path: '/somePath',
         *                body: 'some_request_body'
         *            },
         *            function (request) {
         *                var response = {
         *                    statusCode: 200,
         *                    body: 'some_response_body'
         *                };
         *                return response
         *            }
         *    ).then(
         *            function () {
         *                alert('expectation sent');
         *            },
         *            function (error) {
         *                alert('error');
         *            }
         *    );
         *
         * @param requestMatcher the request matcher for the expectation
         * @param requestHandler the function to be called back when the request is matched
         * @param times the number of times the requestMatcher should be matched
         * @param priority the priority with which this expectation is used to match requests compared to other expectations (high first)
         * @param timeToLive the time this expectation should be used to match requests
         * @param id the unique expectation id
         */
        var mockWithCallback = function (requestMatcher, requestHandler, times, priority, timeToLive, id) {
            return {
                then: function (sucess, error) {
                    try {
                        var webSocketClientPromise = new WebSocketClient(host, port, cleanedContextPath);
                        webSocketClientPromise.then(function (webSocketClient) {
                            webSocketClient.requestCallback(function (request) {
                                var response = requestHandler(request);
                                response.headers = headersUniqueConcatenate(response.headers, [
                                    {
                                        "name": "WebSocketCorrelationId",
                                        "values": request.headers["WebSocketCorrelationId"] || request.headers["websocketcorrelationid"]
                                    }
                                ]);
                                return {
                                    type: "org.mockserver.model.HttpResponse",
                                    value: JSON.stringify(response)
                                };
                            });
                            webSocketClient.clientIdCallback(function (clientId) {
                                return makeRequest(host, port, "/mockserver/expectation", createExpectationWithCallback(requestMatcher, clientId, times, priority, timeToLive, id)).then(sucess, error);
                            });
                        }, error);
                    } catch (e) {
                        if (error) {
                            error(e);
                        }
                    }
                }
            };
        };
        /**
         * Setup an expectation without having to specify the full expectation object
         *, for example:
         *
         *   client.mockSimpleResponse('/somePath', { name: 'value' }, 203);
         *
         * @param path the path to match requests against
         * @param responseBody the response body to return if a request matches
         * @param statusCode the response code to return if a request matches
         */
        var mockSimpleResponse = function (path, responseBody, statusCode) {
            return mockAnyResponse(createExpectation(path, responseBody, statusCode));
        };
        /**
         * Verify a request has been sent, for example:
         *
         *   expect(client.verify({
         *       'httpRequest': {
         *           'method': 'POST',
         *           'path': '/somePath'
         *       }
         *   })).toBeTruthy();
         *
         * @param request the http request that must be matched for this verification to pass
         * @param atLeast the minimum number of times this request must be matched
         * @param atMost  the maximum number of times this request must be matched
         */
        var verify = function (request, atLeast, atMost) {
            if (atLeast === undefined && atMost === undefined) {
                atLeast = 1;
            }
            return {
                then: function (sucess, error) {
                    request.headers = headersUniqueConcatenate(request.headers, defaultRequestHeaders);
                    return makeRequest(host, port, "/mockserver/verify", {
                        "httpRequest": request,
                        "times": {
                            "atLeast": atLeast,
                            "atMost": atMost
                        }
                    }).then(
                        function () {
                            if (sucess) {
                                sucess();
                            }
                        },
                        function (result) {
                            if (!result.statusCode || result.statusCode !== 202) {
                                if (error) {
                                    error(result);
                                }
                            } else {
                                if (error) {
                                    sucess(result);
                                }
                            }
                        }
                    );
                }
            };
        };
        /**
         * Verify a request has been sent by expectation id, for example:
         *
         *   expect(client.verify({
         *           'id': '31e4ca35-66c6-4645-afeb-6e66c4ca0559'
         *       })).toBeTruthy();
         *
         * @param expectationId the expectation id that must be matched for this verification to pass
         * @param atLeast the minimum number of times this request must be matched
         * @param atMost  the maximum number of times this request must be matched
         */
        var verifyById = function (expectationId, atLeast, atMost) {
            if (atLeast === undefined && atMost === undefined) {
                atLeast = 1;
            }
            return {
                then: function (sucess, error) {
                    return makeRequest(host, port, "/mockserver/verify", {
                        "expectationId": expectationId,
                        "times": {
                            "atLeast": atLeast,
                            "atMost": atMost
                        }
                    }).then(
                        function () {
                            if (sucess) {
                                sucess();
                            }
                        },
                        function (result) {
                            if (!result.statusCode || result.statusCode !== 202) {
                                if (error) {
                                    error(result);
                                }
                            } else {
                                if (error) {
                                    sucess(result);
                                }
                            }
                        }
                    );
                }
            };
        };
        /**
         * Verify a sequence of requests has been sent, for example:
         *
         *   client.verifySequence(
         *       {
         *          'method': 'POST',
         *          'path': '/first_request'
         *       },
         *       {
         *          'method': 'POST',
         *          'path': '/second_request'
         *       },
         *       {
         *          'method': 'POST',
         *          'path': '/third_request'
         *       }
         *   );
         *
         * @param arguments the list of http requests that must be matched for this verification to pass
         */
        var verifySequence = function () {
            var requestSequence = [];
            for (var i = 0; i < arguments.length; i++) {
                var requestMatcher = arguments[i];
                requestMatcher.headers = headersUniqueConcatenate(requestMatcher.headers, defaultRequestHeaders);
                requestSequence.push(requestMatcher);
            }
            return {
                then: function (sucess, error) {
                    return makeRequest(host, port, "/mockserver/verifySequence", {
                        "httpRequests": requestSequence
                    }).then(
                        function () {
                            if (sucess) {
                                sucess();
                            }
                        },
                        function (result) {
                            if (!result.statusCode || result.statusCode !== 202) {
                                if (error) {
                                    error(result);
                                }
                            } else {
                                if (error) {
                                    sucess(result);
                                }
                            }
                        }
                    );
                }
            };
        };
        /**
         * Verify a sequence of requests has been sent by match the expectation id, for example:
         *
         *   client.verifySequenceById(
         *       {
         *           'id': '31e4ca35-66c6-4645-afeb-6e66c4ca0559'
         *       },
         *       {
         *           'id': '66c6ca35-ca35-66f5-8feb-5e6ac7ca0559'
         *       },
         *       {
         *           'id': 'ca3531e4-23c8-ff45-88f5-4ca0c7ca0559'
         *       }
         *   );
         *
         * @param arguments the list of expectation ids used to match requests for this verification to pass
         */
        var verifySequenceById = function () {
            /**
             * Convert to array, because otherwise it JSON-encoded as object
             */
            var expectationIds = Array.from(arguments);
            return {
                then: function (sucess, error) {
                    return makeRequest(host, port, "/mockserver/verifySequence", {
                        "expectationIds": expectationIds
                    }).then(
                        function () {
                            if (sucess) {
                                sucess();
                            }
                        },
                        function (result) {
                            if (!result.statusCode || result.statusCode !== 202) {
                                if (error) {
                                    error(result);
                                }
                            } else {
                                if (error) {
                                    sucess(result);
                                }
                            }
                        }
                    );
                }
            };
        };
        /**
         * Reset by clearing all recorded requests
         */
        var reset = function () {
            return makeRequest(host, port, "/mockserver/reset");
        };
        /**
         * Clear all recorded requests, expectations and logs that match the specified path
         *
         * @param pathOrRequestMatcher  if a string is passed in the value will be treated as the path to
         *                              decide what to clear, however if an object is passed
         *                              in the value will be treated as a full request matcher object
         * @param type                  the type to clear 'EXPECTATIONS', 'LOG' or 'ALL', defaults to 'ALL' if not specified
         */
        var clear = function (pathOrRequestMatcher, type) {
            if (type) {
                var typeEnum = ['EXPECTATIONS', 'LOG', 'ALL'];
                if (typeEnum.indexOf(type) === -1) {
                    throw new Error("\"" + (type || "undefined") + "\" is not a supported value for \"type\" parameter only " + typeEnum + " are allowed values");
                }
            }
            return makeRequest(host, port, "/mockserver/clear" + (type ? "?type=" + type : ""), addDefaultRequestMatcherHeaders(pathOrRequestMatcher));
        };
        /**
         * Clear expectations, logs or both that match the expectation id
         *
         * @param expectationId         the expectation id that is used to clear expectations and logs
         * @param type                  the type to clear 'EXPECTATIONS', 'LOG' or 'ALL', defaults to 'ALL' if not specified
         */
        var clearById = function (expectationId, type) {
            if (type) {
                var typeEnum = ['EXPECTATIONS', 'LOG', 'ALL'];
                if (typeEnum.indexOf(type) === -1) {
                    throw new Error("\"" + (type || "undefined") + "\" is not a supported value for \"type\" parameter only " + typeEnum + " are allowed values");
                }
            }
            return makeRequest(host, port, "/mockserver/clear" + (type ? "?type=" + type : ""), { id: expectationId});
        };
        /**
         * Add new ports the server is bound to and listening on
         *
         * @param ports array of ports to bind to, use 0 to bind to any free port
         */
        var bind = function (ports) {
            if (!Array.isArray(ports)) {
                throw new Error("ports parameter must be an array but found: " + JSON.stringify(ports));
            }
            return makeRequest(host, port, "/mockserver/bind", {ports: ports});
        };
        /**
         * Retrieve the recorded requests that match the parameter, as follows:
         * - use a string value to match on path,
         * - use a request matcher object to match on a full request,
         * - or use null to retrieve all requests
         *
         * @param pathOrRequestMatcher  if a string is passed in the value will be treated as the path, however
         *                              if an object is passed in the value will be treated as a full request
         *                              matcher object, if null is passed in it will be treated as match all
         */
        var retrieveRecordedRequests = function (pathOrRequestMatcher) {
            return {
                then: function (sucess, error) {
                    makeRequest(host, port, "/mockserver/retrieve?type=REQUESTS&format=JSON", addDefaultRequestMatcherHeaders(pathOrRequestMatcher))
                        .then(function (result) {
                            sucess(result.body && JSON.parse(result.body));
                        }, function (err) {
                            error(err);
                        });
                }
            };
        };
        /**
         * Retrieve the recorded requests and their responses that match the parameter:
         * - use a string value to match on path,
         * - use a request matcher object to match on a full request,
         * - or use null to retrieve all requests
         *
         * @param pathOrRequestMatcher  if a string is passed in the value will be treated as the path, however
         *                              if an object is passed in the value will be treated as a full request
         *                              matcher object, if null is passed in it will be treated as match all
         */
        var retrieveRecordedRequestsAndResponses = function (pathOrRequestMatcher) {
            return {
                then: function (sucess, error) {
                    makeRequest(host, port, "/mockserver/retrieve?type=REQUEST_RESPONSES&format=JSON", addDefaultRequestMatcherHeaders(pathOrRequestMatcher))
                        .then(function (result) {
                            sucess(result.body && JSON.parse(result.body));
                        }, function (err) {
                            error(err);
                        });
                }
            };
        };
        /**
         * Retrieve the active expectations that match the parameter,
         * the expectations are retrieved by matching the parameter
         * on the expectations own request matcher, as follows:
         * - use a string value to match on path,
         * - use a request matcher object to match on a full request,
         * - or use null to retrieve all requests
         *
         * @param pathOrRequestMatcher  if a string is passed in the value will be treated as the path, however
         *                              if an object is passed in the value will be treated as a full request
         *                              matcher object, if null is passed in it will be treated as match all
         */
        var retrieveActiveExpectations = function (pathOrRequestMatcher) {
            return {
                then: function (sucess, error) {
                    return makeRequest(host, port, "/mockserver/retrieve?type=ACTIVE_EXPECTATIONS&format=JSON", addDefaultRequestMatcherHeaders(pathOrRequestMatcher))
                        .then(function (result) {
                            sucess(result.body && JSON.parse(result.body));
                        }, function (err) {
                            error(err);
                        });
                }
            };
        };
        /**
         * Retrieve the request-response pairs as expectations that match the
         * parameter, expectations are retrieved by matching the parameter
         * on the expectations own request matcher, as follows:
         * - use a string value to match on path,
         * - use a request matcher object to match on a full request,
         * - or use null to retrieve all requests
         *
         * @param pathOrRequestMatcher  if a string is passed in the value will be treated as the path, however
         *                              if an object is passed in the value will be treated as a full request
         *                              matcher object, if null is passed in it will be treated as match all
         */
        var retrieveRecordedExpectations = function (pathOrRequestMatcher) {
            return {
                then: function (sucess, error) {
                    return makeRequest(host, port, "/mockserver/retrieve?type=RECORDED_EXPECTATIONS&format=JSON", addDefaultRequestMatcherHeaders(pathOrRequestMatcher))
                        .then(function (result) {
                            sucess(result.body && JSON.parse(result.body));
                        }, function (err) {
                            error(err);
                        });
                }
            };
        };
        /**
         * Retrieve logs messages for expectation matching, verification, clearing, etc,
         * log messages are filtered by request matcher as follows:
         * - use a string value to match on path,
         * - use a request matcher object to match on a full request,
         * - or use null to retrieve all requests
         *
         * @param pathOrRequestMatcher  if a string is passed in the value will be treated as the path, however
         *                              if an object is passed in the value will be treated as a full request
         *                              matcher object, if null is passed in it will be treated as match all
         */
        var retrieveLogMessages = function (pathOrRequestMatcher) {
            return {
                then: function (sucess, error) {
                    return makeRequest(host, port, "/mockserver/retrieve?type=LOGS", addDefaultRequestMatcherHeaders(pathOrRequestMatcher))
                        .then(function (result) {
                            sucess(result.body && result.body.split("------------------------------------"));
                        }, function (err) {
                            error(err);
                        });
                }
            };
        };

        /* jshint -W003 */
        var _this = {
            openAPIExpectation: openAPIExpectation,
            mockAnyResponse: mockAnyResponse,
            mockWithCallback: mockWithCallback,
            mockSimpleResponse: mockSimpleResponse,
            setDefaultHeaders: setDefaultHeaders,
            verify: verify,
            verifyById: verifyById,
            verifySequence: verifySequence,
            verifySequenceById: verifySequenceById,
            reset: reset,
            clear: clear,
            clearById: clearById,
            bind: bind,
            retrieveRecordedRequests: retrieveRecordedRequests,
            retrieveRecordedRequestsAndResponses: retrieveRecordedRequestsAndResponses,
            retrieveActiveExpectations: retrieveActiveExpectations,
            retrieveRecordedExpectations: retrieveRecordedExpectations,
            retrieveLogMessages: retrieveLogMessages
        };
        return _this;
    };

    if (typeof module !== 'undefined') {
        module.exports = {
            mockServerClient: mockServerClient
        };
    }
})();