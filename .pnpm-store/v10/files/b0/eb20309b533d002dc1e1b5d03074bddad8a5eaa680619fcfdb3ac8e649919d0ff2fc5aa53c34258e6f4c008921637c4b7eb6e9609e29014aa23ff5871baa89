const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_web = require('../../utils/tencent_hunyuan/web.cjs');
const require_base = require('./base.cjs');

//#region src/embeddings/tencent_hunyuan/web.ts
var web_exports = {};
require_rolldown_runtime.__export(web_exports, { TencentHunyuanEmbeddings: () => TencentHunyuanEmbeddings$1 });
/**
* Class for generating embeddings using the Tencent Hunyuan API.
*/
var TencentHunyuanEmbeddings$1 = class extends require_base.TencentHunyuanEmbeddings {
	constructor(fields) {
		super({
			...fields,
			sign: require_web.sign
		});
	}
};

//#endregion
exports.TencentHunyuanEmbeddings = TencentHunyuanEmbeddings$1;
Object.defineProperty(exports, 'web_exports', {
  enumerable: true,
  get: function () {
    return web_exports;
  }
});
//# sourceMappingURL=web.cjs.map