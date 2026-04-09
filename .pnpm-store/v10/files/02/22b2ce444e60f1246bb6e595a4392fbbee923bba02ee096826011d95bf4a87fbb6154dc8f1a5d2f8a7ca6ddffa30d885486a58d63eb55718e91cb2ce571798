import { g as getBrowserState, a as getConfig, r as relative, b as generateFileHash } from "./utils-DCeMntTS.js";
import { channel, globalChannel, client } from "@vitest/browser/client";
import { Traces } from "vitest/internal/browser";
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
  traces;
  constructor() {
    debug("init orchestrator", getBrowserState().sessionId);
    const otelConfig = getBrowserState().config.experimental.openTelemetry;
    this.traces = new Traces({
      enabled: !!((otelConfig == null ? void 0 : otelConfig.enabled) && otelConfig.browserSdkPath),
      sdkPath: `/@fs/${otelConfig == null ? void 0 : otelConfig.browserSdkPath}`
    });
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
    await this.traces.waitInit();
    this.traces.recordInitSpan(
      this.traces.getContextFromCarrier(getBrowserState().otelCarrier)
    );
    const orchestratorSpan = this.traces.startContextSpan(
      "vitest.browser.orchestrator.run",
      this.traces.getContextFromCarrier(options.otelCarrier)
    );
    orchestratorSpan.span.setAttributes({
      "vitest.browser.files": options.files.map((f) => f.filepath)
    });
    const endSpan = async () => {
      orchestratorSpan.span.end();
      await this.traces.flush();
    };
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
      await this.runNonIsolatedTests(container, options, startTime, orchestratorSpan.context);
      await endSpan();
      return;
    }
    this.iframes.forEach((iframe) => iframe.remove());
    this.iframes.clear();
    for (let i = 0; i < options.files.length; i++) {
      if (this.cancelled) {
        await endSpan();
        return;
      }
      const file = options.files[i];
      debug("create iframe", file.filepath);
      await this.runIsolatedTestInIframe(
        container,
        file,
        options,
        startTime,
        orchestratorSpan.context
      );
    }
    await endSpan();
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
    await this.sendEventToIframe({
      event: "cleanup",
      iframeId: ID_ALL
    });
    this.recreateNonIsolatedIframe = true;
  }
  async runNonIsolatedTests(container, options, startTime, otelContext) {
    if (this.recreateNonIsolatedIframe) {
      this.recreateNonIsolatedIframe = false;
      this.iframes.get(ID_ALL).remove();
      this.iframes.delete(ID_ALL);
      debug("recreate non-isolated iframe");
    }
    if (!this.iframes.has(ID_ALL)) {
      debug("preparing non-isolated iframe");
      await this.prepareIframe(container, ID_ALL, startTime, otelContext);
    }
    const config = getConfig();
    const { width, height } = config.browser.viewport;
    const iframe = this.iframes.get(ID_ALL);
    await setIframeViewport(iframe, width, height);
    debug("run non-isolated tests", options.files.join(", "));
    await this.sendEventToIframe({
      event: "execute",
      iframeId: ID_ALL,
      files: options.files,
      method: options.method,
      context: options.providedContext
    });
    debug("finished running tests", options.files.join(", "));
  }
  async runIsolatedTestInIframe(container, spec, options, startTime, otelContext) {
    const config = getConfig();
    const { width, height } = config.browser.viewport;
    const file = spec.filepath;
    if (this.iframes.has(file)) {
      this.iframes.get(file).remove();
      this.iframes.delete(file);
    }
    const iframe = await this.prepareIframe(
      container,
      file,
      startTime,
      otelContext
    );
    await setIframeViewport(iframe, width, height);
    await this.sendEventToIframe({
      event: "execute",
      files: [spec],
      method: options.method,
      iframeId: file,
      context: options.providedContext
    });
    await this.sendEventToIframe({
      event: "cleanup",
      iframeId: file
    });
  }
  dispatchIframeError(error) {
    const event = new CustomEvent("iframeerror", { detail: error });
    this.eventTarget.dispatchEvent(event);
    return error;
  }
  async prepareIframe(container, iframeId, startTime, otelContext) {
    const iframe = this.createTestIframe(iframeId);
    container.appendChild(iframe);
    await new Promise((resolve, reject) => {
      iframe.onload = () => {
        const href = this.getIframeHref(iframe);
        debug("iframe loaded with href", href);
        if (href !== iframe.src) {
          reject(this.dispatchIframeError(new Error(
            `Cannot connect to the iframe. Did you change the location or submitted a form? If so, don't forget to call \`event.preventDefault()\` to avoid reloading the page.

Received URL: ${href || "unknown due to CORS"}
Expected: ${iframe.src}`
          )));
        } else if (this.iframes.has(iframeId)) {
          const events = this.iframeEvents.get(iframe);
          if (events == null ? void 0 : events.size) {
            this.dispatchIframeError(new Error(this.createWarningMessage(iframeId, "during a test")));
          } else {
            this.warnReload(iframe, iframeId);
          }
        } else {
          this.iframes.set(iframeId, iframe);
          this.sendEventToIframe({
            event: "prepare",
            iframeId,
            startTime,
            otelCarrier: this.traces.getContextCarrier(otelContext)
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
  loggedIframe = /* @__PURE__ */ new WeakSet();
  createWarningMessage(iframeId, location) {
    return `The iframe${iframeId === ID_ALL ? "" : ` for "${iframeId}"`} was reloaded ${location}. This can lead to unexpected behavior during tests, duplicated test results or tests hanging.

Make sure that your test code does not change window's location, submit forms without preventing default behavior, or imports unoptimized dependencies.
If you are using a framework that manipulates browser history (like React Router), consider using memory-based routing for tests. If you think this is a false positive, open an issue with a reproduction: https://github.com/vitest-dev/vitest/issues/new`;
  }
  warnReload(iframe, iframeId) {
    if (this.loggedIframe.has(iframe)) {
      return;
    }
    this.loggedIframe.add(iframe);
    const message = `\x1B[41m WARNING \x1B[49m ${this.createWarningMessage(iframeId, "multiple times")}`;
    client.rpc.sendLog("run", {
      type: "stderr",
      time: Date.now(),
      content: message,
      size: message.length,
      taskId: iframeId === ID_ALL ? void 0 : generateFileId(iframeId)
    }).catch(() => {
    });
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
  iframeEvents = /* @__PURE__ */ new WeakMap();
  async sendEventToIframe(event) {
    const iframe = this.iframes.get(event.iframeId);
    if (!iframe) {
      throw new Error(`Cannot find iframe with id ${event.iframeId}`);
    }
    let events = this.iframeEvents.get(iframe);
    if (!events) {
      events = /* @__PURE__ */ new Set();
      this.iframeEvents.set(iframe, events);
    }
    events.add(event.event);
    channel.postMessage(event);
    return new Promise((resolve, reject) => {
      const cleanupEvents = () => {
        channel.removeEventListener("message", onReceived);
        this.eventTarget.removeEventListener("iframeerror", onError);
      };
      function onReceived(e) {
        if (e.data.iframeId === event.iframeId && e.data.event === `response:${event.event}`) {
          resolve();
          cleanupEvents();
          events.delete(event.event);
        }
      }
      function onError(e) {
        reject(e.detail);
        cleanupEvents();
        events.delete(event.event);
      }
      this.eventTarget.addEventListener("iframeerror", onError);
      channel.addEventListener("message", onReceived);
    });
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
