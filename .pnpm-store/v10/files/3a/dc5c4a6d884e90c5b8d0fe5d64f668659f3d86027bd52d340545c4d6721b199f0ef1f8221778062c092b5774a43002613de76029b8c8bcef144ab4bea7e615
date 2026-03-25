import { request } from "@octokit/request";
import { getUserAgent } from "universal-user-agent";
import { VERSION } from "./version";
import { withDefaults } from "./with-defaults";
const graphql = withDefaults(request, {
  headers: {
    "user-agent": `octokit-graphql.js/${VERSION} ${getUserAgent()}`
  },
  method: "POST",
  url: "/graphql"
});
import { GraphqlResponseError } from "./error";
function withCustomRequest(customRequest) {
  return withDefaults(customRequest, {
    method: "POST",
    url: "/graphql"
  });
}
export {
  GraphqlResponseError,
  graphql,
  withCustomRequest
};
