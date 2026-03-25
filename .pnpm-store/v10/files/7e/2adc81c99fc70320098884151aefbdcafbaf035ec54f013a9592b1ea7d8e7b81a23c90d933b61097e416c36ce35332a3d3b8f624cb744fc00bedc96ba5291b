const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_index = require('../../utils/tencent_hunyuan/index.cjs');
const require_base = require('./base.cjs');

//#region src/embeddings/tencent_hunyuan/index.ts
var tencent_hunyuan_exports = {};
require_rolldown_runtime.__export(tencent_hunyuan_exports, { TencentHunyuanEmbeddings: () => TencentHunyuanEmbeddings$1 });
/**
* Class for generating embeddings using the Tencent Hunyuan API.
*/
var TencentHunyuanEmbeddings$1 = class extends require_base.TencentHunyuanEmbeddings {
	constructor(fields) {
		super({
			...fields,
			sign: require_index.sign
		});
	}
};

//#endregion
exports.TencentHunyuanEmbeddings = TencentHunyuanEmbeddings$1;
Object.defineProperty(exports, 'tencent_hunyuan_exports', {
  enumerable: true,
  get: function () {
    return tencent_hunyuan_exports;
  }
});
//# sourceMappingURL=index.cjs.map