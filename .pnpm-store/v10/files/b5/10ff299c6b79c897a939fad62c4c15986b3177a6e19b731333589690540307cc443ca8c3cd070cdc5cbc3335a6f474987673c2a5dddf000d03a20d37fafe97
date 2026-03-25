import { VERSION } from "./version.js";
import { endpointsToMethods } from "./endpoints-to-methods.js";
function restEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    rest: api
  };
}
restEndpointMethods.VERSION = VERSION;
function legacyRestEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    ...api,
    rest: api
  };
}
legacyRestEndpointMethods.VERSION = VERSION;
export {
  legacyRestEndpointMethods,
  restEndpointMethods
};
