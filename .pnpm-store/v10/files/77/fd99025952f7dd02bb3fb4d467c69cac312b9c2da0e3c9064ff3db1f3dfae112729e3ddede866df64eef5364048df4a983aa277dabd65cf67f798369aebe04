import { parentPort } from "worker_threads";
import * as Comlink from "../../../dist/esm/comlink.mjs";
import nodeEndpoint from "../../../dist/esm/node-adapter.mjs";

const api = {
  doMath() {
    return 4;
  },
};
Comlink.expose(api, nodeEndpoint(parentPort));
