import { endpoint } from "@octokit/endpoint";
import { getUserAgent } from "universal-user-agent";
import { VERSION } from "./version.js";
import withDefaults from "./with-defaults.js";
const request = withDefaults(endpoint, {
  headers: {
    "user-agent": `octokit-request.js/${VERSION} ${getUserAgent()}`
  }
});
export {
  request
};
