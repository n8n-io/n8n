import { t as require_binding } from "./shared/binding-kg77KQCQ.mjs";

//#region src/cli/setup-index.ts
var import_binding = require_binding();
let isWatchMode = false;
for (let i = 0; i < process.argv.length; i++) {
	const arg = process.argv[i];
	if (arg === "--watch" || arg === "-w") {
		isWatchMode = true;
		break;
	}
}
if (isWatchMode) (0, import_binding.createTokioRuntime)(32);
else (0, import_binding.createTokioRuntime)(4);

//#endregion
export {  };