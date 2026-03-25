import { g as getBrowserState, a as getConfig, r as relative, b as generateFileHash } from "./utils-uxqdqUz8.js";
import { channel, globalChannel, client } from "@vitest/browser/client";
// @__NO_SIDE_EFFECTS__
function getUiAPI() {
  return window.__vitest_ui_api__;
}
const ID_ALL = "__vitest_all__";
class IframeOrchestrator {
  cancelled = false;
  recreateNonIsolatedIframe = false;
  iframes = /* @__PURE__ */ new Map();
  eventTarget = new EventTarget();
  constructor() {
    debug("init orchestrator", getBrowserState().sessionId);
    channel.addEventListener(
      "message",
      (e) => this.onIframeEvent(e)
    );
    globalChannel.addEventListener(
      "message",
      (e) => this.onGlobalChannelEvent(e)
    );
  }
  async createTesters(options) {
    const startTime = performance.now();
    this.cancelled = false;
    const config = getConfig();
    debug("create testers", ...options.files.join(", "));
    const container = await getContainer(config);
    if (config.browser.ui) {
      container.className = "absolute origin-top mt-[8px]";
      container.parentElement.setAttribute("data-ready", "true");
      if (container.textContent) {
        container.textContent = "";
      }
    }
    if (config.browser.isolate === false) {
      await this.runNonIsolatedTests(container, options, startTime);
      return;
    }
    this.iframes.forEach((iframe) => iframe.remove());
    this.iframes.clear();
    for (let i = 0; i < options.files.length; i++) {
      if (this.cancelled) {
        return;
      }
      const file = options.files[i];
      debug("create iframe", file.filepath);
      await this.runIsolatedTestInIframe(
        container,
        file,
        options,
        startTime
      );
    }
  }
  async cleanupTesters() {
    const config = getConfig();
    if (config.browser.isolate) {
      const files = Array.from(this.iframes.keys());
      const ui = /* @__PURE__ */ getUiAPI();
      if (ui && files[0]) {
        const id = generateFileId(files[0]);
        ui.setCurrentFileId(id);
      }
      return;
    }
    const iframe = this.iframes.get(ID_ALL);
    if (!iframe) {
      return;
    }
    await sendEventToIframe({
      event: "cleanup",
      iframeId: ID_ALL
    });
    this.recreateNonIsolatedIframe = true;
  }
  async runNonIsolatedTests(container, options, startTime) {
    if (this.recreateNonIsolatedIframe) {
      this.recreateNonIsolatedIframe = false;
      this.iframes.get(ID_ALL).remove();
      this.iframes.delete(ID_ALL);
      debug("recreate non-isolated iframe");
    }
    if (!this.iframes.has(ID_ALL)) {
      debug("preparing non-isolated iframe");
      await this.prepareIframe(container, ID_ALL, startTime);
    }
    const config = getConfig();
    const { width, height } = config.browser.viewport;
    const iframe = this.iframes.get(ID_ALL);
    await setIframeViewport(iframe, width, height);
    debug("run non-isolated tests", options.files.join(", "));
    await sendEventToIframe({
      event: "execute",
      iframeId: ID_ALL,
      files: options.files,
      method: options.method,
      context: options.providedContext
    });
    debug("finished running tests", options.files.join(", "));
  }
  async runIsolatedTestInIframe(container, spec, options, startTime) {
    const config = getConfig();
    const { width, height } = config.browser.viewport;
    const file = spec.filepath;
    if (this.iframes.has(file)) {
      this.iframes.get(file).remove();
      this.iframes.delete(file);
    }
    const iframe = await this.prepareIframe(container, file, startTime);
    await setIframeViewport(iframe, width, height);
    await sendEventToIframe({
      event: "execute",
      files: [spec],
      method: options.method,
      iframeId: file,
      context: options.providedContext
    });
    await sendEventToIframe({
      event: "cleanup",
      iframeId: file
    });
  }
  dispatchIframeError(error) {
    const event = new CustomEvent("iframeerror", { detail: error });
    this.eventTarget.dispatchEvent(event);
    return error;
  }
  async prepareIframe(container, iframeId, startTime) {
    const iframe = this.createTestIframe(iframeId);
    container.appendChild(iframe);
    await new Promise((resolve, reject) => {
      iframe.onload = () => {
        const href = this.getIframeHref(iframe);
        debug("iframe loaded with href", href);
        if (href !== iframe.src) {
          reject(this.dispatchIframeError(new Error(
            `Cannot connect to the iframe. Did you change the location or submitted a form? If so, don't forget to call \`event.preventDefault()\` to avoid reloading the page.

Received URL: ${href || "unknown"}
Expected: ${iframe.src}`
          )));
        } else {
          this.iframes.set(iframeId, iframe);
          sendEventToIframe({
            event: "prepare",
            iframeId,
            startTime
          }).then(resolve, (error) => reject(this.dispatchIframeError(error)));
        }
      };
      iframe.onerror = (e) => {
        if (typeof e === "string") {
          reject(this.dispatchIframeError(new Error(e)));
        } else if (e instanceof ErrorEvent) {
          reject(this.dispatchIframeError(e.error));
        } else {
          reject(this.dispatchIframeError(new Error(`Cannot load the iframe ${iframeId}.`)));
        }
      };
    });
    return iframe;
  }
  getIframeHref(iframe) {
    var _a;
    try {
      return (_a = iframe.contentWindow) == null ? void 0 : _a.location.href;
    } catch {
      return void 0;
    }
  }
  createTestIframe(iframeId) {
    const iframe = document.createElement("iframe");
    const src = `/?sessionId=${getBrowserState().sessionId}&iframeId=${iframeId}`;
    iframe.setAttribute("loading", "eager");
    iframe.setAttribute("src", src);
    iframe.setAttribute("data-vitest", "true");
    iframe.style.border = "none";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("allow", "clipboard-write;");
    iframe.setAttribute("name", "vitest-iframe");
    return iframe;
  }
  async onGlobalChannelEvent(e) {
    debug("global channel event", JSON.stringify(e.data));
    switch (e.data.type) {
      case "cancel": {
        this.cancelled = true;
        break;
      }
    }
  }
  async onIframeEvent(e) {
    debug("iframe event", JSON.stringify(e.data));
    switch (e.data.event) {
      case "viewport": {
        const { width, height, iframeId: id } = e.data;
        const iframe = this.iframes.get(id);
        if (!iframe) {
          const error = `Cannot find iframe with id ${id}`;
          channel.postMessage({
            event: "viewport:fail",
            iframeId: id,
            error
          });
          await client.rpc.onUnhandledError(
            {
              name: "Teardown Error",
              message: error
            },
            "Teardown Error"
          );
          break;
        }
        await setIframeViewport(iframe, width, height);
        channel.postMessage({ event: "viewport:done", iframeId: id });
        break;
      }
      default: {
        if (typeof e.data.event === "string" && e.data.event.startsWith("response:")) {
          break;
        }
        await client.rpc.onUnhandledError(
          {
            name: "Unexpected Event",
            message: `Unexpected event: ${e.data.event}`
          },
          "Unexpected Event"
        );
      }
    }
  }
}
const orchestrator = new IframeOrchestrator();
getBrowserState().orchestrator = orchestrator;
async function getContainer(config) {
  if (config.browser.ui) {
    const element = document.querySelector("#tester-ui");
    if (!element) {
      return new Promise((resolve) => {
        queueMicrotask(() => {
          resolve(getContainer(config));
        });
      });
    }
    return element;
  }
  return document.querySelector("#vitest-tester");
}
async function sendEventToIframe(event) {
  channel.postMessage(event);
  return new Promise((resolve, reject) => {
    function cleanupEvents() {
      channel.removeEventListener("message", onReceived);
      orchestrator.eventTarget.removeEventListener("iframeerror", onError);
    }
    function onReceived(e) {
      if (e.data.iframeId === event.iframeId && e.data.event === `response:${event.event}`) {
        resolve();
        cleanupEvents();
      }
    }
    function onError(e) {
      reject(e.detail);
      cleanupEvents();
    }
    orchestrator.eventTarget.addEventListener("iframeerror", onError);
    channel.addEventListener("message", onReceived);
  });
}
function generateFileId(file) {
  const config = getConfig();
  const path = relative(config.root, file);
  return generateFileHash(path, config.name);
}
async function setIframeViewport(iframe, width, height) {
  var _a, _b;
  const ui = /* @__PURE__ */ getUiAPI();
  if (ui) {
    await ui.setIframeViewport(width, height);
  } else if (getBrowserState().provider === "webdriverio") {
    (_a = iframe.parentElement) == null ? void 0 : _a.setAttribute("data-scale", "1");
    await client.rpc.triggerCommand(
      getBrowserState().sessionId,
      "__vitest_viewport",
      void 0,
      [{ width, height }]
    );
  } else {
    const scale = Math.min(
      1,
      iframe.parentElement.parentElement.clientWidth / width,
      iframe.parentElement.parentElement.clientHeight / height
    );
    iframe.parentElement.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      transform: scale(${scale});
      transform-origin: left top;
    `;
    (_b = iframe.parentElement) == null ? void 0 : _b.setAttribute("data-scale", String(scale));
    await new Promise((r) => requestAnimationFrame(r));
  }
}
function debug(...args) {
  const debug2 = getConfig().env.VITEST_BROWSER_DEBUG;
  if (debug2 && debug2 !== "false") {
    client.rpc.debug(...args.map(String));
  }
}
