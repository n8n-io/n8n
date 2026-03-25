// The `ipc` option adds an `ipc` item to the `stdio` option
export const normalizeIpcStdioArray = (stdioArray, ipc) => ipc && !stdioArray.includes('ipc')
	? [...stdioArray, 'ipc']
	: stdioArray;
