import { parentPort } from "worker_threads";
import * as Comlink from "../../dist/esm/comlink.mjs";
import nodeEndpoint from "../../dist/esm/node-adapter.mjs";

Comlink.expose((a, b) => a + b, nodeEndpoint(parentPort));
