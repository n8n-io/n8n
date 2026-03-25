const require_context = require('./context-CQfDPcdE.cjs');
let node_fs = require("node:fs");
node_fs = require_context.__toESM(node_fs);
let node_path = require("node:path");
node_path = require_context.__toESM(node_path);

//#region src/rspack/utils.ts
function encodeVirtualModuleId(id, plugin) {
	return (0, node_path.resolve)(plugin.__virtualModulePrefix, encodeURIComponent(id));
}
function decodeVirtualModuleId(encoded, _plugin) {
	return decodeURIComponent((0, node_path.basename)(encoded));
}
function isVirtualModuleId(encoded, plugin) {
	return (0, node_path.dirname)(encoded) === plugin.__virtualModulePrefix;
}
var FakeVirtualModulesPlugin = class FakeVirtualModulesPlugin {
	name = "FakeVirtualModulesPlugin";
	static counters = /* @__PURE__ */ new Map();
	static initCleanup = false;
	constructor(plugin) {
		this.plugin = plugin;
		if (!FakeVirtualModulesPlugin.initCleanup) {
			FakeVirtualModulesPlugin.initCleanup = true;
			process.once("exit", () => {
				FakeVirtualModulesPlugin.counters.forEach((_, dir) => {
					node_fs.default.rmSync(dir, {
						recursive: true,
						force: true
					});
				});
			});
		}
	}
	apply(compiler) {
		const dir = this.plugin.__virtualModulePrefix;
		if (!node_fs.default.existsSync(dir)) node_fs.default.mkdirSync(dir, { recursive: true });
		const counter = FakeVirtualModulesPlugin.counters.get(dir) ?? 0;
		FakeVirtualModulesPlugin.counters.set(dir, counter + 1);
		compiler.hooks.shutdown.tap(this.name, () => {
			const counter$1 = (FakeVirtualModulesPlugin.counters.get(dir) ?? 1) - 1;
			if (counter$1 === 0) {
				FakeVirtualModulesPlugin.counters.delete(dir);
				node_fs.default.rmSync(dir, {
					recursive: true,
					force: true
				});
			} else FakeVirtualModulesPlugin.counters.set(dir, counter$1);
		});
	}
	async writeModule(file) {
		return node_fs.default.promises.writeFile(file, "");
	}
};

//#endregion
Object.defineProperty(exports, 'FakeVirtualModulesPlugin', {
  enumerable: true,
  get: function () {
    return FakeVirtualModulesPlugin;
  }
});
Object.defineProperty(exports, 'decodeVirtualModuleId', {
  enumerable: true,
  get: function () {
    return decodeVirtualModuleId;
  }
});
Object.defineProperty(exports, 'encodeVirtualModuleId', {
  enumerable: true,
  get: function () {
    return encodeVirtualModuleId;
  }
});
Object.defineProperty(exports, 'isVirtualModuleId', {
  enumerable: true,
  get: function () {
    return isVirtualModuleId;
  }
});