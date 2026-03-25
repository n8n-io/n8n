import { withAuthorizationPrefix } from "./with-authorization-prefix";
async function hook(token, request, route, parameters) {
  const endpoint = request.endpoint.merge(
    route,
    parameters
  );
  endpoint.headers.authorization = withAuthorizationPrefix(token);
  return request(endpoint);
}
export {
  hook
};
