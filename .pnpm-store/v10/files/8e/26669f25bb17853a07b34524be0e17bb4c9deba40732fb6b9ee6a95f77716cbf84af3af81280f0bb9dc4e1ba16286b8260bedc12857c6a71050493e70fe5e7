const require_context = require('../../context-CQfDPcdE.cjs');
const require_webpack_like = require('../../webpack-like-DDVwPJ4e.cjs');
const require_context$1 = require('../../context-D7WFmOmt.cjs');

//#region src/webpack/loaders/load.ts
async function load(source, map) {
	const callback = this.async();
	const { plugin } = this.query;
	let id = this.resource;
	if (!plugin?.load || !id) return callback(null, source, map);
	if (id.startsWith(plugin.__virtualModulePrefix)) id = decodeURIComponent(id.slice(plugin.__virtualModulePrefix.length));
	const context = require_context$1.createContext(this);
	const { handler } = require_context.normalizeObjectHook("load", plugin.load);
	const res = await handler.call(Object.assign({}, require_context$1.createBuildContext({
		addWatchFile: (file) => {
			this.addDependency(file);
		},
		getWatchFiles: () => {
			return this.getDependencies();
		}
	}, this._compiler, this._compilation, this), context), require_webpack_like.normalizeAbsolutePath(id));
	if (res == null) callback(null, source, map);
	else if (typeof res !== "string") callback(null, res.code, res.map ?? map);
	else callback(null, res, map);
}

//#endregion
module.exports = load;