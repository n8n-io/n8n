import { l as PluginDriver, s as validateOption, t as RolldownBuild } from "./rolldown-build-D2CkFbcq.mjs";

//#region src/api/rolldown/index.ts
const rolldown = async (input) => {
	validateOption("input", input);
	return new RolldownBuild(await PluginDriver.callOptionsHook(input));
};

//#endregion
export { rolldown as t };