import { n as normalizeObjectHook } from "../../context-Csj9j3eN.js";
import { n as createBuildContext, r as createContext } from "../../context-OCFO8EW1.js";

//#region src/webpack/loaders/transform.ts
async function transform(source, map) {
	const callback = this.async();
	const { plugin } = this.query;
	if (!plugin?.transform) return callback(null, source, map);
	const context = createContext(this);
	const { handler, filter } = normalizeObjectHook("transform", plugin.transform);
	if (!filter(this.resource, source)) return callback(null, source, map);
	try {
		const res = await handler.call(Object.assign({}, createBuildContext({
			addWatchFile: (file) => {
				this.addDependency(file);
			},
			getWatchFiles: () => {
				return this.getDependencies();
			}
		}, this._compiler, this._compilation, this, map), context), source, this.resource);
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