import { DN as __vitePreload } from "./app-D5flEmb-.js";
import "./module-ES6BEMUI-BS5SHpbR.js";
//#region ../../../node_modules/.pnpm/quickjs-emscripten-core@0.32.0/node_modules/quickjs-emscripten-core/dist/index.mjs
async function newQuickJSWASMModuleFromVariant(variantOrPromise) {
	let variant = smartUnwrap(await variantOrPromise), [wasmModuleLoader, QuickJSFFI, { QuickJSWASMModule: QuickJSWASMModule2 }] = await Promise.all([
		variant.importModuleLoader().then(smartUnwrap),
		variant.importFFI(),
		__vitePreload(() => import("./module-ES6BEMUI-BS5SHpbR.js").then(smartUnwrap), [])
	]), wasmModule = await wasmModuleLoader();
	wasmModule.type = "sync";
	return new QuickJSWASMModule2(wasmModule, new QuickJSFFI(wasmModule));
}
function smartUnwrap(val) {
	return val && "default" in val && val.default ? val.default && "default" in val.default && val.default.default ? val.default.default : val.default : val;
}
//#endregion
export { newQuickJSWASMModuleFromVariant };
