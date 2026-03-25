const require_context = require('../../context-CQfDPcdE.cjs');
const require_webpack_like = require('../../webpack-like-DDVwPJ4e.cjs');
const require_context$1 = require('../../context-CrbHoDid.cjs');
const require_utils = require('../../utils-CJMEEaD7.cjs');

//#region src/rspack/loaders/load.ts
async function load(source, map) {
	const callback = this.async();
	const { plugin } = this.query;
	let id = this.resource;
	if (!plugin?.load || !id) return callback(null, source, map);
	if (require_utils.isVirtualModuleId(id, plugin)) id = require_utils.decodeVirtualModuleId(id, plugin);
	const context = require_context$1.createContext(this);
	const { handler } = require_context.normalizeObjectHook("load", plugin.load);
	try {
		const res = await handler.call(Object.assign({}, this._compilation && require_context$1.createBuildContext(this._compiler, this._compilation, this), context), require_webpack_like.normalizeAbsolutePath(id));
		if (res == null) callback(null, source, map);
		else if (typeof res !== "string") callback(null, res.code, res.map ?? map);
		else callback(null, res, map);
	} catch (error) {
		if (error instanceof Error) callback(error);
		else callback(new Error(String(error)));
	}
}

//#endregion
module.exports = load;