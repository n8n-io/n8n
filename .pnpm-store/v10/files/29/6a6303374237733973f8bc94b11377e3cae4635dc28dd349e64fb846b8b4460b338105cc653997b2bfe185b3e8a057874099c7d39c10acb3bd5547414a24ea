import { HttpRequest } from "@smithy/protocol-http";
import { GENERATED_HEADERS } from "./constants";
export const prepareRequest = (request) => {
    request = HttpRequest.clone(request);
    for (const headerName of Object.keys(request.headers)) {
        if (GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
            delete request.headers[headerName];
        }
    }
    return request;
};
