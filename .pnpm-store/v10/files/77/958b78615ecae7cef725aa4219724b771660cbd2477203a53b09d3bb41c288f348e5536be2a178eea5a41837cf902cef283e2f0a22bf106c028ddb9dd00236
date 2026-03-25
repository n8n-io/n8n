import { Worker } from "worker_threads";
import * as Comlink from "../../../dist/esm/comlink.mjs";
import nodeEndpoint from "../../../dist/esm/node-adapter.mjs";

async function init() {
  const worker = new Worker("./worker.mjs");

  const api = Comlink.wrap(nodeEndpoint(worker));
  console.log(await api.doMath());
}
init();
