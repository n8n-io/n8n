import { parse, getFirst, COMMON_SUPPORTED_ARGS } from "../../parse.js";
import { toWebServices } from "./webservices.js";
import { toHTTPInterface } from "./httpinterface.js";
export const supportedArgs = new Set([
    ...COMMON_SUPPORTED_ARGS,
    "insecure",
    "no-insecure",
    "form",
    "form-string",
]);
export function _toMATLAB(requests, warnings = []) {
    const request = getFirst(requests, warnings);
    const [webServicesLines] = toWebServices(request, warnings);
    const [httpInterfaceLines] = toHTTPInterface(request, warnings);
    const lines = webServicesLines.concat("", httpInterfaceLines);
    return lines
        .flat()
        .filter((line) => line !== null)
        .join("\n");
}
export function toMATLABWarn(curlCommand, warnings = []) {
    const requests = parse(curlCommand, supportedArgs, warnings);
    const matlab = _toMATLAB(requests, warnings);
    return [matlab, warnings];
}
export function toMATLAB(curlCommand) {
    return toMATLABWarn(curlCommand)[0];
}
//# sourceMappingURL=matlab.js.map