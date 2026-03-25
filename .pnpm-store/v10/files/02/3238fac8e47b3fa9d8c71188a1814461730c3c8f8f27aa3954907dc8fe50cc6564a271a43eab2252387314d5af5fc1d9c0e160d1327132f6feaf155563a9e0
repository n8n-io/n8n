import { useStreamLGP } from "./stream.lgp.js";
import { useStreamCustom } from "./stream.custom.js";
import { useState } from "react";

//#region src/react/stream.tsx
function isCustomOptions(options) {
	return "transport" in options;
}
function useStream(options) {
	const [isCustom] = useState(isCustomOptions(options));
	if (isCustom) return useStreamCustom(options);
	return useStreamLGP(options);
}

//#endregion
export { useStream };
//# sourceMappingURL=stream.js.map