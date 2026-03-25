import { _ as Logger, g as ReportPlugin, s as ResolvedConfig } from "./index-BcO8yjl6.mjs";
import { Plugin } from "rolldown";

//#region src/features/external.d.ts
declare function ExternalPlugin({
  pkg,
  noExternal,
  inlineOnly,
  skipNodeModulesBundle
}: ResolvedConfig): Plugin;
//#endregion
//#region src/features/shebang.d.ts
declare function ShebangPlugin(logger: Logger, cwd: string, name?: string, isMultiFormat?: boolean): Plugin;
//#endregion
//#region src/features/node-protocol.d.ts
/**
* The `node:` protocol was added in Node.js v14.18.0.
* @see https://nodejs.org/api/esm.html#node-imports
*/
declare function NodeProtocolPlugin(nodeProtocolOption: "strip" | true): Plugin;
//#endregion
export { ExternalPlugin, NodeProtocolPlugin, ReportPlugin, ShebangPlugin };