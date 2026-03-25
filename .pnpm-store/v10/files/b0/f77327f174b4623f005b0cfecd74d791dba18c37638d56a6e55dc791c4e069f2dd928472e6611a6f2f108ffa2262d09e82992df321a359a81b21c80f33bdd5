"use client";


const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const react = require_rolldown_runtime.__toESM(require("react"));

//#region src/react/thread.tsx
const useControllableThreadId = (options) => {
	const [localThreadId, _setLocalThreadId] = (0, react.useState)(options?.threadId ?? null);
	const onThreadIdRef = (0, react.useRef)(options?.onThreadId);
	onThreadIdRef.current = options?.onThreadId;
	const setThreadId = (0, react.useCallback)((threadId) => {
		_setLocalThreadId(threadId);
		onThreadIdRef.current?.(threadId);
	}, []);
	if (!options || !("threadId" in options)) return [localThreadId, setThreadId];
	return [options.threadId ?? null, setThreadId];
};

//#endregion
exports.useControllableThreadId = useControllableThreadId;
//# sourceMappingURL=thread.cjs.map