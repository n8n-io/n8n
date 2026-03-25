import * as Comlink from 'comlink';

const TEST_WORKER_URL = './test-worker.js';
const TEST_WORKER_TERMINATE = true;

const mapProxyToReleaser = new WeakMap();
const workerFinalization = new FinalizationRegistry(release => release());

/**
 * @typedef TestContextParams
 * @property {string} [build]
 * @property {string} [config]
 * @property {boolean} [reset]
 */

/** @type {TestContextParams} */
const DEFAULT_PARAMS = Object.freeze({
  build: 'default',
  config: 'default',
  reset: true
});

export class TestContext {
  #params = structuredClone(DEFAULT_PARAMS);

  /**
   * @param {TestContextParams} params 
   */
  constructor(params = {}) {
    Object.assign(this.#params, params);
  }

  async create(extras = {}) {
    const url = new URL(TEST_WORKER_URL, import.meta.url);
    for (const [key, value] of Object.entries(this.#params)) {
      url.searchParams.set(key, value.toString());
    }
    for (const [key, value] of Object.entries(extras)) {
      url.searchParams.set(key, value.toString());
    }

    const worker = new Worker(url, { type: 'module' });
    const port = await new Promise(resolve => {
      worker.addEventListener('message', (event) => {
        if (event.ports[0]) {
          return resolve(event.ports[0]);
        }
        const e = new Error(event.data.message);
        throw Object.assign(e, event.data);
      }, { once: true });
    });

    const proxy = Comlink.wrap(port);
    if (TEST_WORKER_TERMINATE) {
      function releaser() {
        worker.terminate();
      }
      mapProxyToReleaser.set(proxy, releaser);
      workerFinalization.register(proxy, releaser);
    }

    return proxy;
  }

  async destroy(proxy) {
    proxy[Comlink.releaseProxy]();
    const releaser = mapProxyToReleaser.get(proxy);
    if (releaser) {
      workerFinalization.unregister(releaser);
      releaser();
    }
  }

  // https://github.com/WebAssembly/js-promise-integration/issues/21#issuecomment-1634843621
  static async supportsJSPI() {
    try {
      const m = new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 1, 111, 0, 3, 2, 1, 0, 7, 5, 1,
        1, 111, 0, 0, 10, 4, 1, 2, 0, 11,
      ]);
      const { instance } = await WebAssembly.instantiate(m);
      // @ts-ignore
      new WebAssembly.Function(
        {
          parameters: [],
          results: ["externref"],
        },
        instance.exports.o,
        { promising: "first" }
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}
