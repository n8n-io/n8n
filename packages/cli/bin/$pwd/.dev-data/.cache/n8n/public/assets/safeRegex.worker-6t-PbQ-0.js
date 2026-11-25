//#region src/app/utils/safeRegex.worker.ts
function withGlobalFlag(flags) {
	return flags?.includes("g") ? flags : `${flags ?? ""}g`;
}
function executeRegex(request) {
	const regex = new RegExp(request.pattern, request.flags);
	switch (request.operation) {
		case "exec": return regex.exec(request.input);
		case "test": return regex.test(request.input);
		case "replace": return request.input.replace(regex, request.replacement ?? "");
		case "matchAll": return Array.from(request.input.matchAll(new RegExp(request.pattern, withGlobalFlag(request.flags))));
		case "split": return request.input.split(regex);
	}
}
self.onmessage = ({ data }) => {
	try {
		self.postMessage({
			id: data.id,
			result: executeRegex(data)
		});
	} catch (error) {
		self.postMessage({
			id: data.id,
			error: error instanceof Error ? error.message : "Regular expression execution failed"
		});
	}
};
//#endregion
