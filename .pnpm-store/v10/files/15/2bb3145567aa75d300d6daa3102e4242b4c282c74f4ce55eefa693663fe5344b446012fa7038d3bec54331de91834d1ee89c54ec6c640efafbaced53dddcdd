"use client";


import { useCallback, useRef, useState } from "react";

//#region src/react/thread.tsx
const useControllableThreadId = (options) => {
	const [localThreadId, _setLocalThreadId] = useState(options?.threadId ?? null);
	const onThreadIdRef = useRef(options?.onThreadId);
	onThreadIdRef.current = options?.onThreadId;
	const setThreadId = useCallback((threadId) => {
		_setLocalThreadId(threadId);
		onThreadIdRef.current?.(threadId);
	}, []);
	if (!options || !("threadId" in options)) return [localThreadId, setThreadId];
	return [options.threadId ?? null, setThreadId];
};

//#endregion
export { useControllableThreadId };
//# sourceMappingURL=thread.js.map