'use strict';

var urlParser = require('@smithy/url-parser');

const toEndpointV1 = (endpoint) => {
    if (typeof endpoint === "object") {
        if ("url" in endpoint) {
            const v1Endpoint = urlParser.parseUrl(endpoint.url);
            if (endpoint.headers) {
                v1Endpoint.headers = {};
                for (const [name, values] of Object.entries(endpoint.headers)) {
                    v1Endpoint.headers[name.toLowerCase()] = values.join(", ");
                }
            }
            return v1Endpoint;
        }
        return endpoint;
    }
    return urlParser.parseUrl(endpoint);
};

exports.toEndpointV1 = toEndpointV1;
