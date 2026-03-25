import { HttpRequest } from "@smithy/protocol-http";
export const moveHeadersToQuery = (request, options = {}) => {
    const { headers, query = {} } = HttpRequest.clone(request);
    for (const name of Object.keys(headers)) {
        const lname = name.toLowerCase();
        if ((lname.slice(0, 6) === "x-amz-" && !options.unhoistableHeaders?.has(lname)) ||
            options.hoistableHeaders?.has(lname)) {
            query[name] = headers[name];
            delete headers[name];
        }
    }
    return {
        ...request,
        headers,
        query,
    };
};
