import { t as tscEmit } from "./tsc-BW5Mr7EL.mjs";
import "./context-EuY-ImLj.mjs";
const process = globalThis.process;
import { createBirpc } from "birpc";

//#region src/tsc/worker.ts
createBirpc({ tscEmit }, {
	post: (data) => process.send(data),
	on: (fn) => process.on("message", fn)
});

//#endregion
export {  };