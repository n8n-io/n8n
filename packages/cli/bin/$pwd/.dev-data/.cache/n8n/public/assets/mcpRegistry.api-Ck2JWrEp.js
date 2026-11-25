import { Fw as makeRestApiRequest } from "./app-D5flEmb-.js";
//#region src/features/shared/toolsConnection/mcpRegistry.api.ts
async function fetchMcpRegistryCatalog(context) {
	return await makeRestApiRequest(context, "GET", "/mcp-registry/servers");
}
async function discoverMcpConnection(context, request) {
	return await makeRestApiRequest(context, "POST", "/mcp-registry/discover", request);
}
//#endregion
export { fetchMcpRegistryCatalog as n, discoverMcpConnection as t };
