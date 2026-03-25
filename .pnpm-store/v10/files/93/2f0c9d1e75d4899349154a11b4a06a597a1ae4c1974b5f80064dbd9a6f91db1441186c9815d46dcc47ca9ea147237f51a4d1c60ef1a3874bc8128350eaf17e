import { n as normalizeObjectHook } from "../../context-Csj9j3eN.js";
import { t as normalizeAbsolutePath } from "../../webpack-like-DFGTNSuV.js";
import { n as createContext, t as createBuildContext } from "../../context-DkYlx1xL.js";
import { i as isVirtualModuleId, n as decodeVirtualModuleId } from "../../utils-BosfZ0pB.js";

//#region src/rspack/loaders/load.ts
async function load(source, map) {
	const callback = this.async();
	const { plugin } = this.query;
	let id = this.resource;
	if (!plugin?.load || !id) return callback(null, source, map);
	if (isVirtualModuleId(id, plugin)) id = decodeVirtualModuleId(id, plugin);
	const context = createContext(this);
	const { handler } = normalizeObjectHook("load", plugin.load);
	try {
		const res = await handler.call(Object.assign({}, this._compilation && createBuildContext(this._compiler, this._compilation, this), context), normalizeAbsolutePath(id));
		if (res == null) callback(null, source, map);
		else if (typeof res !== "string") callback(null, res.code, res.map ?? map);
		else callback(null, res, map);
	} catch (error) {
		if (error instanceof Error) callback(error);
		else callback(new Error(String(error)));
	}
}

//#endregion
export { load as default };