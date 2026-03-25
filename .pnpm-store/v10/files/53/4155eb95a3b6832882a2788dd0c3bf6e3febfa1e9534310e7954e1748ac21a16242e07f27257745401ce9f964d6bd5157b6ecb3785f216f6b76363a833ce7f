import { request as Request } from "@octokit/request";
import { graphql } from "./graphql";
function withDefaults(request, newDefaults) {
  const newRequest = request.defaults(newDefaults);
  const newApi = (query, options) => {
    return graphql(newRequest, query, options);
  };
  return Object.assign(newApi, {
    defaults: withDefaults.bind(null, newRequest),
    endpoint: newRequest.endpoint
  });
}
export {
  withDefaults
};
