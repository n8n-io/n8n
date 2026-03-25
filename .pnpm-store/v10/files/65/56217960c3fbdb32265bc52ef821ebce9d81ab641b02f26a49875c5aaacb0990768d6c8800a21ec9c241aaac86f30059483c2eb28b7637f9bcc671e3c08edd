import { VERSION } from "./version.js";
import { paginate } from "./paginate.js";
import { iterator } from "./iterator.js";
import { composePaginateRest } from "./compose-paginate.js";
import {
  isPaginatingEndpoint,
  paginatingEndpoints
} from "./paginating-endpoints.js";
function paginateRest(octokit) {
  return {
    paginate: Object.assign(paginate.bind(null, octokit), {
      iterator: iterator.bind(null, octokit)
    })
  };
}
paginateRest.VERSION = VERSION;
export {
  composePaginateRest,
  isPaginatingEndpoint,
  paginateRest,
  paginatingEndpoints
};
