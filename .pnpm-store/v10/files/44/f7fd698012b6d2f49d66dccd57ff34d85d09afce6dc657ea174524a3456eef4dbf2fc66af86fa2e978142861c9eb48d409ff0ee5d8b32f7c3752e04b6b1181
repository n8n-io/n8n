const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_stream_lgp = require('./stream.lgp.cjs');
const require_stream_custom = require('./stream.custom.cjs');
const react = require_rolldown_runtime.__toESM(require("react"));

//#region src/react/stream.tsx
function isCustomOptions(options) {
	return "transport" in options;
}
function useStream(options) {
	const [isCustom] = (0, react.useState)(isCustomOptions(options));
	if (isCustom) return require_stream_custom.useStreamCustom(options);
	return require_stream_lgp.useStreamLGP(options);
}

//#endregion
exports.useStream = useStream;
//# sourceMappingURL=stream.cjs.map