import { t as require_binding } from "./shared/binding-kg77KQCQ.mjs";
import { n as onExit, t as watch } from "./shared/watch-BWN40jw1.mjs";
import "./shared/logs-CSQ_UMWp.mjs";
import "./shared/misc-CxyvWjTr.mjs";
import { _ as VERSION } from "./shared/normalize-string-or-regex-VlPkMWXA.mjs";
import "./shared/rolldown-build-D2CkFbcq.mjs";
import "./shared/bindingify-input-options-6nBAYjYP.mjs";
import "./shared/parse-ast-index-C44ewaWh.mjs";
import { t as rolldown } from "./shared/rolldown-CpwN72kC.mjs";
import { t as defineConfig } from "./shared/define-config-DfeZGBEt.mjs";
import { isMainThread } from "node:worker_threads";

//#region src/setup.ts
var import_binding$1 = require_binding();
if (isMainThread) {
	const subscriberGuard = (0, import_binding$1.initTraceSubscriber)();
	onExit(() => {
		subscriberGuard?.close();
	});
}

//#endregion
//#region src/api/build.ts
async function build(options) {
	if (Array.isArray(options)) return Promise.all(options.map((opts) => build(opts)));
	else {
		const { output, write = true, ...inputOptions } = options;
		const build$1 = await rolldown(inputOptions);
		try {
			if (write) return await build$1.write(output);
			else return await build$1.generate(output);
		} finally {
			await build$1.close();
		}
	}
}

//#endregion
//#region src/index.ts
var import_binding = require_binding();

//#endregion
var BindingMagicString = import_binding.BindingMagicString;
export { BindingMagicString, VERSION, build, defineConfig, rolldown, watch };