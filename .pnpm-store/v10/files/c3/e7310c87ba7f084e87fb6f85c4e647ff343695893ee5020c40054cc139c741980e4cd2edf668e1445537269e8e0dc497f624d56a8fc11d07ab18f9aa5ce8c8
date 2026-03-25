import { n as normalizeObjectHook } from "../../context-Csj9j3eN.js";
import { n as createContext, t as createBuildContext } from "../../context-DkYlx1xL.js";

//#region src/rspack/loaders/transform.ts
async function transform(source, map) {
	const callback = this.async();
	const { plugin } = this.query;
	if (!plugin?.transform) return callback(null, source, map);
	const id = this.resource;
	const context = createContext(this);
	const { handler, filter } = normalizeObjectHook("transform", plugin.transform);
	if (!filter(this.resource, source)) return callback(null, source, map);
	try {
		const res = await handler.call(Object.assign({}, this._compilation && createBuildContext(this._compiler, this._compilation, this, map), context), source, id);
		if (res == null) callback(null, source, map);
		else if (typeof res !== "string") callback(null, res.code, map == null ? map : res.map || map);
		else callback(null, res, map);
	} catch (error) {
		if (error instanceof Error) callback(error);
		else callback(new Error(String(error)));
	}
}

//#endregion
export { transform as default };