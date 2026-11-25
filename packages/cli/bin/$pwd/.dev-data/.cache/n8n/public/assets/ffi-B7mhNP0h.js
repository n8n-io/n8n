//#region ../../../node_modules/.pnpm/@jitl+quickjs-wasmfile-release-sync@0.32.0/node_modules/@jitl/quickjs-wasmfile-release-sync/dist/ffi.mjs
var QuickJSFFI = class {
	constructor(module) {
		this.module = module;
		this.DEBUG = !1;
		this.QTS_Throw = this.module.cwrap("QTS_Throw", "number", ["number", "number"]);
		this.QTS_NewError = this.module.cwrap("QTS_NewError", "number", ["number"]);
		this.QTS_RuntimeSetMemoryLimit = this.module.cwrap("QTS_RuntimeSetMemoryLimit", null, ["number", "number"]);
		this.QTS_RuntimeComputeMemoryUsage = this.module.cwrap("QTS_RuntimeComputeMemoryUsage", "number", ["number", "number"]);
		this.QTS_RuntimeDumpMemoryUsage = this.module.cwrap("QTS_RuntimeDumpMemoryUsage", "number", ["number"]);
		this.QTS_RecoverableLeakCheck = this.module.cwrap("QTS_RecoverableLeakCheck", "number", []);
		this.QTS_BuildIsSanitizeLeak = this.module.cwrap("QTS_BuildIsSanitizeLeak", "number", []);
		this.QTS_RuntimeSetMaxStackSize = this.module.cwrap("QTS_RuntimeSetMaxStackSize", null, ["number", "number"]);
		this.QTS_GetUndefined = this.module.cwrap("QTS_GetUndefined", "number", []);
		this.QTS_GetNull = this.module.cwrap("QTS_GetNull", "number", []);
		this.QTS_GetFalse = this.module.cwrap("QTS_GetFalse", "number", []);
		this.QTS_GetTrue = this.module.cwrap("QTS_GetTrue", "number", []);
		this.QTS_NewHostRef = this.module.cwrap("QTS_NewHostRef", "number", ["number", "number"]);
		this.QTS_GetHostRefId = this.module.cwrap("QTS_GetHostRefId", "number", ["number"]);
		this.QTS_NewRuntime = this.module.cwrap("QTS_NewRuntime", "number", []);
		this.QTS_FreeRuntime = this.module.cwrap("QTS_FreeRuntime", null, ["number"]);
		this.QTS_NewContext = this.module.cwrap("QTS_NewContext", "number", ["number", "number"]);
		this.QTS_FreeContext = this.module.cwrap("QTS_FreeContext", null, ["number"]);
		this.QTS_FreeValuePointer = this.module.cwrap("QTS_FreeValuePointer", null, ["number", "number"]);
		this.QTS_FreeValuePointerRuntime = this.module.cwrap("QTS_FreeValuePointerRuntime", null, ["number", "number"]);
		this.QTS_FreeVoidPointer = this.module.cwrap("QTS_FreeVoidPointer", null, ["number", "number"]);
		this.QTS_FreeCString = this.module.cwrap("QTS_FreeCString", null, ["number", "number"]);
		this.QTS_DupValuePointer = this.module.cwrap("QTS_DupValuePointer", "number", ["number", "number"]);
		this.QTS_NewObject = this.module.cwrap("QTS_NewObject", "number", ["number"]);
		this.QTS_NewObjectProto = this.module.cwrap("QTS_NewObjectProto", "number", ["number", "number"]);
		this.QTS_NewArray = this.module.cwrap("QTS_NewArray", "number", ["number"]);
		this.QTS_NewArrayBuffer = this.module.cwrap("QTS_NewArrayBuffer", "number", [
			"number",
			"number",
			"number"
		]);
		this.QTS_NewFloat64 = this.module.cwrap("QTS_NewFloat64", "number", ["number", "number"]);
		this.QTS_GetFloat64 = this.module.cwrap("QTS_GetFloat64", "number", ["number", "number"]);
		this.QTS_NewString = this.module.cwrap("QTS_NewString", "number", ["number", "number"]);
		this.QTS_GetString = this.module.cwrap("QTS_GetString", "number", ["number", "number"]);
		this.QTS_GetArrayBuffer = this.module.cwrap("QTS_GetArrayBuffer", "number", ["number", "number"]);
		this.QTS_GetArrayBufferLength = this.module.cwrap("QTS_GetArrayBufferLength", "number", ["number", "number"]);
		this.QTS_NewSymbol = this.module.cwrap("QTS_NewSymbol", "number", [
			"number",
			"number",
			"number"
		]);
		this.QTS_GetSymbolDescriptionOrKey = this.module.cwrap("QTS_GetSymbolDescriptionOrKey", "number", ["number", "number"]);
		this.QTS_IsGlobalSymbol = this.module.cwrap("QTS_IsGlobalSymbol", "number", ["number", "number"]);
		this.QTS_IsJobPending = this.module.cwrap("QTS_IsJobPending", "number", ["number"]);
		this.QTS_ExecutePendingJob = this.module.cwrap("QTS_ExecutePendingJob", "number", [
			"number",
			"number",
			"number"
		]);
		this.QTS_GetProp = this.module.cwrap("QTS_GetProp", "number", [
			"number",
			"number",
			"number"
		]);
		this.QTS_GetPropNumber = this.module.cwrap("QTS_GetPropNumber", "number", [
			"number",
			"number",
			"number"
		]);
		this.QTS_SetProp = this.module.cwrap("QTS_SetProp", null, [
			"number",
			"number",
			"number",
			"number"
		]);
		this.QTS_DefineProp = this.module.cwrap("QTS_DefineProp", null, [
			"number",
			"number",
			"number",
			"number",
			"number",
			"number",
			"boolean",
			"boolean",
			"boolean"
		]);
		this.QTS_GetOwnPropertyNames = this.module.cwrap("QTS_GetOwnPropertyNames", "number", [
			"number",
			"number",
			"number",
			"number",
			"number"
		]);
		this.QTS_Call = this.module.cwrap("QTS_Call", "number", [
			"number",
			"number",
			"number",
			"number",
			"number"
		]);
		this.QTS_ResolveException = this.module.cwrap("QTS_ResolveException", "number", ["number", "number"]);
		this.QTS_Dump = this.module.cwrap("QTS_Dump", "number", ["number", "number"]);
		this.QTS_Eval = this.module.cwrap("QTS_Eval", "number", [
			"number",
			"number",
			"number",
			"string",
			"number",
			"number"
		]);
		this.QTS_GetModuleNamespace = this.module.cwrap("QTS_GetModuleNamespace", "number", ["number", "number"]);
		this.QTS_Typeof = this.module.cwrap("QTS_Typeof", "number", ["number", "number"]);
		this.QTS_GetLength = this.module.cwrap("QTS_GetLength", "number", [
			"number",
			"number",
			"number"
		]);
		this.QTS_IsEqual = this.module.cwrap("QTS_IsEqual", "number", [
			"number",
			"number",
			"number",
			"number"
		]);
		this.QTS_GetGlobalObject = this.module.cwrap("QTS_GetGlobalObject", "number", ["number"]);
		this.QTS_NewPromiseCapability = this.module.cwrap("QTS_NewPromiseCapability", "number", ["number", "number"]);
		this.QTS_PromiseState = this.module.cwrap("QTS_PromiseState", "number", ["number", "number"]);
		this.QTS_PromiseResult = this.module.cwrap("QTS_PromiseResult", "number", ["number", "number"]);
		this.QTS_TestStringArg = this.module.cwrap("QTS_TestStringArg", null, ["string"]);
		this.QTS_GetDebugLogEnabled = this.module.cwrap("QTS_GetDebugLogEnabled", "number", ["number"]);
		this.QTS_SetDebugLogEnabled = this.module.cwrap("QTS_SetDebugLogEnabled", null, ["number", "number"]);
		this.QTS_BuildIsDebug = this.module.cwrap("QTS_BuildIsDebug", "number", []);
		this.QTS_BuildIsAsyncify = this.module.cwrap("QTS_BuildIsAsyncify", "number", []);
		this.QTS_NewFunction = this.module.cwrap("QTS_NewFunction", "number", [
			"number",
			"string",
			"number",
			"boolean",
			"number"
		]);
		this.QTS_ArgvGetJSValueConstPointer = this.module.cwrap("QTS_ArgvGetJSValueConstPointer", "number", ["number", "number"]);
		this.QTS_RuntimeEnableInterruptHandler = this.module.cwrap("QTS_RuntimeEnableInterruptHandler", null, ["number"]);
		this.QTS_RuntimeDisableInterruptHandler = this.module.cwrap("QTS_RuntimeDisableInterruptHandler", null, ["number"]);
		this.QTS_RuntimeEnableModuleLoader = this.module.cwrap("QTS_RuntimeEnableModuleLoader", null, ["number", "number"]);
		this.QTS_RuntimeDisableModuleLoader = this.module.cwrap("QTS_RuntimeDisableModuleLoader", null, ["number"]);
		this.QTS_bjson_encode = this.module.cwrap("QTS_bjson_encode", "number", ["number", "number"]);
		this.QTS_bjson_decode = this.module.cwrap("QTS_bjson_decode", "number", ["number", "number"]);
	}
};
//#endregion
export { QuickJSFFI };
