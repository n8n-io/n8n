Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
class Mirror {
  constructor() {
    __publicField$1(this, "idNodeMap", /* @__PURE__ */ new Map());
    __publicField$1(this, "nodeMetaMap", /* @__PURE__ */ new WeakMap());
  }
  getId(n2) {
    if (!n2) return -1;
    const id = this.getMeta(n2)?.id;
    return id ?? -1;
  }
  getNode(id) {
    return this.idNodeMap.get(id) || null;
  }
  getIds() {
    return Array.from(this.idNodeMap.keys());
  }
  getMeta(n2) {
    return this.nodeMetaMap.get(n2) || null;
  }
  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n2) {
    const id = this.getId(n2);
    this.idNodeMap.delete(id);
    if (n2.childNodes) {
      n2.childNodes.forEach(
        (childNode) => this.removeNodeFromMap(childNode)
      );
    }
  }
  has(id) {
    return this.idNodeMap.has(id);
  }
  hasNode(node) {
    return this.nodeMetaMap.has(node);
  }
  add(n2, meta) {
    const id = meta.id;
    this.idNodeMap.set(id, n2);
    this.nodeMetaMap.set(n2, meta);
  }
  replace(id, n2) {
    const oldNode = this.getNode(id);
    if (oldNode) {
      const meta = this.nodeMetaMap.get(oldNode);
      if (meta) this.nodeMetaMap.set(n2, meta);
    }
    this.idNodeMap.set(id, n2);
  }
  reset() {
    this.idNodeMap = /* @__PURE__ */ new Map();
    this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
  }
}
function createMirror$2() {
  return new Mirror();
}
function elementClassMatchesRegex(el, regex) {
  for (let eIndex = el.classList.length; eIndex--; ) {
    const className = el.classList[eIndex];
    if (regex.test(className)) {
      return true;
    }
  }
  return false;
}
function distanceToMatch(node, matchPredicate, limit = Infinity, distance = 0) {
  if (!node) return -1;
  if (node.nodeType !== node.ELEMENT_NODE) return -1;
  if (distance > limit) return -1;
  if (matchPredicate(node)) return distance;
  return distanceToMatch(node.parentNode, matchPredicate, limit, distance + 1);
}
function createMatchPredicate(className, selector) {
  return (node) => {
    const el = node;
    if (el === null) return false;
    try {
      if (className) {
        if (typeof className === "string") {
          if (el.matches(`.${className}`)) return true;
        } else if (elementClassMatchesRegex(el, className)) {
          return true;
        }
      }
      if (selector && el.matches(selector)) return true;
      return false;
    } catch {
      return false;
    }
  };
}
const DEPARTED_MIRROR_ACCESS_WARNING = "Please stop import mirror directly. Instead of that,\r\nnow you can use replayer.getMirror() to access the mirror instance of a replayer,\r\nor you can use record.mirror to access the mirror instance during recording.";
let _mirror = {
  map: {},
  getId() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return -1;
  },
  getNode() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return null;
  },
  removeNodeFromMap() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  },
  has() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return false;
  },
  reset() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  }
};
if (typeof window !== "undefined" && window.Proxy && window.Reflect) {
  _mirror = new Proxy(_mirror, {
    get(target, prop, receiver) {
      if (prop === "map") {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
function hookSetter(target, key, d, isRevoked, win = window) {
  const original = win.Object.getOwnPropertyDescriptor(target, key);
  win.Object.defineProperty(
    target,
    key,
    isRevoked ? d : {
      set(value) {
        setTimeout$1(() => {
          d.set.call(this, value);
        }, 0);
        if (original && original.set) {
          original.set.call(this, value);
        }
      }
    }
  );
  return () => hookSetter(target, key, original || {}, true);
}
function patch(source, name, replacement) {
  try {
    if (!(name in source)) {
      return () => {
      };
    }
    const original = source[name];
    const wrapped = replacement(original);
    if (typeof wrapped === "function") {
      wrapped.prototype = wrapped.prototype || {};
      Object.defineProperties(wrapped, {
        __rrweb_original__: {
          enumerable: false,
          value: original
        }
      });
    }
    source[name] = wrapped;
    return () => {
      source[name] = original;
    };
  } catch {
    return () => {
    };
  }
}
if (!/* @__PURE__ */ /[1-9][0-9]{12}/.test(Date.now().toString())) ;
function closestElementOfNode(node) {
  if (!node) {
    return null;
  }
  try {
    const el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
    return el;
  } catch (error) {
    return null;
  }
}
function isBlocked(node, blockClass, blockSelector, unblockSelector, checkAncestors) {
  if (!node) {
    return false;
  }
  const el = closestElementOfNode(node);
  if (!el) {
    return false;
  }
  const blockedPredicate = createMatchPredicate(blockClass, blockSelector);
  if (!checkAncestors) {
    const isUnblocked = unblockSelector && el.matches(unblockSelector);
    return blockedPredicate(el) && !isUnblocked;
  }
  const blockDistance = distanceToMatch(el, blockedPredicate);
  let unblockDistance = -1;
  if (blockDistance < 0) {
    return false;
  }
  if (unblockSelector) {
    unblockDistance = distanceToMatch(
      el,
      createMatchPredicate(null, unblockSelector)
    );
  }
  if (blockDistance > -1 && unblockDistance < 0) {
    return true;
  }
  return blockDistance < unblockDistance;
}
const cachedImplementations = {};
function getImplementation(name) {
  const cached = cachedImplementations[name];
  if (cached) {
    return cached;
  }
  const document2 = window.document;
  let impl = window[name];
  if (document2 && typeof document2.createElement === "function") {
    try {
      const sandbox = document2.createElement("iframe");
      sandbox.hidden = true;
      document2.head.appendChild(sandbox);
      const contentWindow = sandbox.contentWindow;
      if (contentWindow && contentWindow[name]) {
        impl = // eslint-disable-next-line @typescript-eslint/unbound-method
        contentWindow[name];
      }
      document2.head.removeChild(sandbox);
    } catch (e2) {
    }
  }
  return cachedImplementations[name] = impl.bind(
    window
  );
}
function onRequestAnimationFrame(...rest) {
  return getImplementation("requestAnimationFrame")(...rest);
}
function setTimeout$1(...rest) {
  return getImplementation("setTimeout")(...rest);
}
var CanvasContext = /* @__PURE__ */ ((CanvasContext2) => {
  CanvasContext2[CanvasContext2["2D"] = 0] = "2D";
  CanvasContext2[CanvasContext2["WebGL"] = 1] = "WebGL";
  CanvasContext2[CanvasContext2["WebGL2"] = 2] = "WebGL2";
  return CanvasContext2;
})(CanvasContext || {});
let errorHandler;
function registerErrorHandler(handler) {
  errorHandler = handler;
}
const callbackWrapper = (cb) => {
  if (!errorHandler) {
    return cb;
  }
  const rrwebWrapped = (...rest) => {
    try {
      return cb(...rest);
    } catch (error) {
      if (errorHandler && errorHandler(error) === true) {
        return () => {
        };
      }
      throw error;
    }
  };
  return rrwebWrapped;
};
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
for (var i$1 = 0; i$1 < chars.length; i$1++) {
  lookup[chars.charCodeAt(i$1)] = i$1;
}
var encode = function(arraybuffer) {
  var bytes = new Uint8Array(arraybuffer), i2, len = bytes.length, base64 = "";
  for (i2 = 0; i2 < len; i2 += 3) {
    base64 += chars[bytes[i2] >> 2];
    base64 += chars[(bytes[i2] & 3) << 4 | bytes[i2 + 1] >> 4];
    base64 += chars[(bytes[i2 + 1] & 15) << 2 | bytes[i2 + 2] >> 6];
    base64 += chars[bytes[i2 + 2] & 63];
  }
  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + "==";
  }
  return base64;
};
const canvasVarMap = /* @__PURE__ */ new Map();
function variableListFor$1(ctx, ctor) {
  let contextMap = canvasVarMap.get(ctx);
  if (!contextMap) {
    contextMap = /* @__PURE__ */ new Map();
    canvasVarMap.set(ctx, contextMap);
  }
  if (!contextMap.has(ctor)) {
    contextMap.set(ctor, []);
  }
  return contextMap.get(ctor);
}
const saveWebGLVar = (value, win, ctx) => {
  if (!value || !(isInstanceOfWebGLObject(value, win) || typeof value === "object"))
    return;
  const name = value.constructor.name;
  const list = variableListFor$1(ctx, name);
  let index = list.indexOf(value);
  if (index === -1) {
    index = list.length;
    list.push(value);
  }
  return index;
};
function serializeArg(value, win, ctx) {
  if (value instanceof Array) {
    return value.map((arg) => serializeArg(arg, win, ctx));
  } else if (value === null) {
    return value;
  } else if (value instanceof Float32Array || value instanceof Float64Array || value instanceof Int32Array || value instanceof Uint32Array || value instanceof Uint8Array || value instanceof Uint16Array || value instanceof Int16Array || value instanceof Int8Array || value instanceof Uint8ClampedArray) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [Object.values(value)]
    };
  } else if (
    // SharedArrayBuffer disabled on most browsers due to spectre.
    // More info: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/SharedArrayBuffer
    // value instanceof SharedArrayBuffer ||
    value instanceof ArrayBuffer
  ) {
    const name = value.constructor.name;
    const base64 = encode(value);
    return {
      rr_type: name,
      base64
    };
  } else if (value instanceof DataView) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [
        serializeArg(value.buffer, win, ctx),
        value.byteOffset,
        value.byteLength
      ]
    };
  } else if (value instanceof HTMLImageElement) {
    const name = value.constructor.name;
    const { src } = value;
    return {
      rr_type: name,
      src
    };
  } else if (value instanceof HTMLCanvasElement) {
    const name = "HTMLImageElement";
    const src = value.toDataURL();
    return {
      rr_type: name,
      src
    };
  } else if (value instanceof ImageData) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [serializeArg(value.data, win, ctx), value.width, value.height]
    };
  } else if (isInstanceOfWebGLObject(value, win) || typeof value === "object") {
    const name = value.constructor.name;
    const index = saveWebGLVar(value, win, ctx);
    return {
      rr_type: name,
      index
    };
  }
  return value;
}
const serializeArgs = (args, win, ctx) => {
  return args.map((arg) => serializeArg(arg, win, ctx));
};
const isInstanceOfWebGLObject = (value, win) => {
  const webGLConstructorNames = [
    "WebGLActiveInfo",
    "WebGLBuffer",
    "WebGLFramebuffer",
    "WebGLProgram",
    "WebGLRenderbuffer",
    "WebGLShader",
    "WebGLShaderPrecisionFormat",
    "WebGLTexture",
    "WebGLUniformLocation",
    "WebGLVertexArrayObject",
    // In old Chrome versions, value won't be an instanceof WebGLVertexArrayObject.
    "WebGLVertexArrayObjectOES"
  ];
  const supportedWebGLConstructorNames = webGLConstructorNames.filter(
    (name) => typeof win[name] === "function"
  );
  return Boolean(
    supportedWebGLConstructorNames.find(
      (name) => value instanceof win[name]
    )
  );
};
function initCanvas2DMutationObserver(cb, win, blockClass2, blockSelector, unblockSelector) {
  const handlers = [];
  const props2D = Object.getOwnPropertyNames(
    win.CanvasRenderingContext2D.prototype
  );
  for (const prop of props2D) {
    try {
      if (typeof win.CanvasRenderingContext2D.prototype[prop] !== "function") {
        continue;
      }
      const restoreHandler = patch(
        win.CanvasRenderingContext2D.prototype,
        prop,
        function(original) {
          return function(...args) {
            if (!isBlocked(
              this.canvas,
              blockClass2,
              blockSelector,
              unblockSelector,
              true
            )) {
              setTimeout$1(() => {
                const recordArgs = serializeArgs(args, win, this);
                cb(this.canvas, {
                  type: CanvasContext["2D"],
                  property: prop,
                  args: recordArgs
                });
              }, 0);
            }
            return original.apply(this, args);
          };
        }
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter(
        win.CanvasRenderingContext2D.prototype,
        prop,
        {
          set(v2) {
            cb(this.canvas, {
              type: CanvasContext["2D"],
              property: prop,
              args: [v2],
              setter: true
            });
          }
        }
      );
      handlers.push(hookHandler);
    }
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
function getNormalizedContextName(contextType) {
  return contextType === "experimental-webgl" ? "webgl" : contextType;
}
function initCanvasContextObserver(win, blockClass, blockSelector, unblockSelector, setPreserveDrawingBufferToTrue) {
  const handlers = [];
  try {
    const restoreHandler = patch(
      win.HTMLCanvasElement.prototype,
      "getContext",
      function(original) {
        return function(contextType, ...args) {
          if (!isBlocked(this, blockClass, blockSelector, unblockSelector, true)) {
            const ctxName = getNormalizedContextName(contextType);
            if (!("__context" in this)) this.__context = ctxName;
            if (setPreserveDrawingBufferToTrue && ["webgl", "webgl2"].includes(ctxName)) {
              if (args[0] && typeof args[0] === "object") {
                const contextAttributes = args[0];
                if (!contextAttributes.preserveDrawingBuffer) {
                  contextAttributes.preserveDrawingBuffer = true;
                }
              } else {
                args.splice(0, 1, {
                  preserveDrawingBuffer: true
                });
              }
            }
          }
          return original.apply(this, [contextType, ...args]);
        };
      }
    );
    handlers.push(restoreHandler);
  } catch {
    console.error("failed to patch HTMLCanvasElement.prototype.getContext");
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
function patchGLPrototype(prototype, type, cb, blockClass2, blockSelector, unblockSelector, _mirror2, win) {
  const handlers = [];
  const props = Object.getOwnPropertyNames(prototype);
  for (const prop of props) {
    if (
      //prop.startsWith('get') ||  // e.g. getProgramParameter, but too risky
      [
        "isContextLost",
        "canvas",
        "drawingBufferWidth",
        "drawingBufferHeight"
      ].includes(prop)
    ) {
      continue;
    }
    try {
      if (typeof prototype[prop] !== "function") {
        continue;
      }
      const restoreHandler = patch(
        prototype,
        prop,
        function(original) {
          return function(...args) {
            const result = original.apply(this, args);
            saveWebGLVar(result, win, this);
            if ("tagName" in this.canvas && !isBlocked(
              this.canvas,
              blockClass2,
              blockSelector,
              unblockSelector,
              true
            )) {
              const recordArgs = serializeArgs(args, win, this);
              const mutation = {
                type,
                property: prop,
                args: recordArgs
              };
              cb(this.canvas, mutation);
            }
            return result;
          };
        }
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter(prototype, prop, {
        set(v2) {
          cb(this.canvas, {
            type,
            property: prop,
            args: [v2],
            setter: true
          });
        }
      });
      handlers.push(hookHandler);
    }
  }
  return handlers;
}
function initCanvasWebGLMutationObserver(cb, win, blockClass2, blockSelector, unblockSelector, mirror2) {
  const handlers = [];
  handlers.push(
    ...patchGLPrototype(
      win.WebGLRenderingContext.prototype,
      CanvasContext.WebGL,
      cb,
      blockClass2,
      blockSelector,
      unblockSelector,
      mirror2,
      win
    )
  );
  if (typeof win.WebGL2RenderingContext !== "undefined") {
    handlers.push(
      ...patchGLPrototype(
        win.WebGL2RenderingContext.prototype,
        CanvasContext.WebGL2,
        cb,
        blockClass2,
        blockSelector,
        unblockSelector,
        mirror2,
        win
      )
    );
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
const r$1 = `for(var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",t="undefined"==typeof Uint8Array?[]:new Uint8Array(256),a=0;a<64;a++)t[e.charCodeAt(a)]=a;var n=function(t){var a,n=new Uint8Array(t),r=n.length,s="";for(a=0;a<r;a+=3)s+=e[n[a]>>2],s+=e[(3&n[a])<<4|n[a+1]>>4],s+=e[(15&n[a+1])<<2|n[a+2]>>6],s+=e[63&n[a+2]];return r%3==2?s=s.substring(0,s.length-1)+"=":r%3==1&&(s=s.substring(0,s.length-2)+"=="),s};const r=new Map,s=new Map;const i=self;i.onmessage=async function(e){if(!("OffscreenCanvas"in globalThis))return i.postMessage({id:e.data.id});{const{id:t,bitmap:a,width:o,height:f,maxCanvasSize:c,dataURLOptions:g}=e.data,u=async function(e,t,a){const r=e+"-"+t;if("OffscreenCanvas"in globalThis){if(s.has(r))return s.get(r);const i=new OffscreenCanvas(e,t);i.getContext("2d");const o=await i.convertToBlob(a),f=await o.arrayBuffer(),c=n(f);return s.set(r,c),c}return""}(o,f,g),[h,d]=function(e,t,a){if(!a)return[e,t];const[n,r]=a;if(e<=n&&t<=r)return[e,t];let s=e,i=t;return s>n&&(i=Math.floor(n*t/e),s=n),i>r&&(s=Math.floor(r*e/t),i=r),[s,i]}(o,f,c),l=new OffscreenCanvas(h,d),w=l.getContext("bitmaprenderer"),p=h===o&&d===f?a:await createImageBitmap(a,{resizeWidth:h,resizeHeight:d,resizeQuality:"low"});w?.transferFromImageBitmap(p),a.close();const y=await l.convertToBlob(g),v=y.type,b=await y.arrayBuffer(),m=n(b);if(p.close(),!r.has(t)&&await u===m)return r.set(t,m),i.postMessage({id:t});if(r.get(t)===m)return i.postMessage({id:t});i.postMessage({id:t,type:v,base64:m,width:o,height:f}),r.set(t,m)}};`;
function t$1() {
  const t2 = new Blob([r$1]);
  return URL.createObjectURL(t2);
}
class CanvasManager {
  constructor(options) {
    this.pendingCanvasMutations = /* @__PURE__ */ new Map();
    this.rafStamps = { latestId: 0, invokeId: null };
    this.shadowDoms = /* @__PURE__ */ new Set();
    this.windowsSet = /* @__PURE__ */ new WeakSet();
    this.windows = [];
    this.restoreHandlers = [];
    this.frozen = false;
    this.locked = false;
    this.snapshotInProgressMap = /* @__PURE__ */ new Map();
    this.worker = null;
    this.lastSnapshotTime = 0;
    this.processMutation = (target, mutation) => {
      const newFrame = this.rafStamps.invokeId && this.rafStamps.latestId !== this.rafStamps.invokeId;
      if (newFrame || !this.rafStamps.invokeId)
        this.rafStamps.invokeId = this.rafStamps.latestId;
      if (!this.pendingCanvasMutations.has(target)) {
        this.pendingCanvasMutations.set(target, []);
      }
      this.pendingCanvasMutations.get(target).push(mutation);
    };
    const {
      enableManualSnapshot,
      sampling = "all",
      win,
      recordCanvas,
      errorHandler: errorHandler2
    } = options;
    options.sampling = sampling;
    this.mutationCb = options.mutationCb;
    this.mirror = options.mirror;
    this.options = options;
    if (errorHandler2) {
      registerErrorHandler(errorHandler2);
    }
    if (recordCanvas && typeof sampling === "number" || enableManualSnapshot) {
      this.worker = this.initFPSWorker();
    }
    this.addWindow(win);
    if (enableManualSnapshot) {
      return;
    }
    callbackWrapper(() => {
      if (recordCanvas && sampling === "all") {
        this.startRAFTimestamping();
        this.startPendingCanvasMutationFlusher();
      }
      if (recordCanvas && typeof sampling === "number") {
        this.initCanvasFPSObserver();
      }
    })();
  }
  reset() {
    this.pendingCanvasMutations.clear();
    this.restoreHandlers.forEach((handler) => {
      try {
        handler();
      } catch (e2) {
      }
    });
    this.restoreHandlers = [];
    this.windowsSet = /* @__PURE__ */ new WeakSet();
    this.windows = [];
    this.shadowDoms = /* @__PURE__ */ new Set();
    this.worker?.terminate();
    this.worker = null;
    this.snapshotInProgressMap = /* @__PURE__ */ new Map();
  }
  freeze() {
    this.frozen = true;
  }
  unfreeze() {
    this.frozen = false;
  }
  lock() {
    this.locked = true;
  }
  unlock() {
    this.locked = false;
  }
  addWindow(win) {
    const {
      sampling = "all",
      blockClass,
      blockSelector,
      unblockSelector,
      recordCanvas,
      enableManualSnapshot
    } = this.options;
    if (this.windowsSet.has(win)) return;
    if (enableManualSnapshot) {
      this.windowsSet.add(win);
      this.windows.push(new WeakRef(win));
      return;
    }
    callbackWrapper(() => {
      if (recordCanvas && sampling === "all") {
        this.initCanvasMutationObserver(
          win,
          blockClass,
          blockSelector,
          unblockSelector
        );
      }
      if (recordCanvas && typeof sampling === "number") {
        const canvasContextReset = initCanvasContextObserver(
          win,
          blockClass,
          blockSelector,
          unblockSelector,
          true
        );
        this.restoreHandlers.push(() => {
          canvasContextReset();
        });
      }
    })();
    this.windowsSet.add(win);
    this.windows.push(new WeakRef(win));
  }
  addShadowRoot(shadowRoot) {
    this.shadowDoms.add(new WeakRef(shadowRoot));
  }
  resetShadowRoots() {
    this.shadowDoms = /* @__PURE__ */ new Set();
  }
  snapshot(canvasElement, options) {
    if (options?.skipRequestAnimationFrame) {
      this.takeSnapshot(performance.now(), true, canvasElement);
      return;
    }
    onRequestAnimationFrame(
      (timestamp) => this.takeSnapshot(timestamp, true, canvasElement)
    );
  }
  initFPSWorker() {
    const worker = new Worker(t$1());
    worker.onmessage = (e2) => {
      const data = e2.data;
      const { id } = data;
      this.snapshotInProgressMap.set(id, false);
      if (!("base64" in data)) return;
      const { base64, type, width, height } = data;
      this.mutationCb({
        id,
        type: CanvasContext["2D"],
        commands: [
          {
            property: "clearRect",
            // wipe canvas
            args: [0, 0, width, height]
          },
          {
            property: "drawImage",
            // draws (semi-transparent) image
            args: [
              {
                rr_type: "ImageBitmap",
                args: [
                  {
                    rr_type: "Blob",
                    data: [{ rr_type: "ArrayBuffer", base64 }],
                    type
                  }
                ]
              },
              0,
              0,
              // The below args are needed if we enforce a max size, we want to
              // retain the original size when drawing the image (which should be smaller)
              width,
              height
            ]
          }
        ]
      });
    };
    return worker;
  }
  initCanvasFPSObserver() {
    let rafId;
    if (!this.windows.length && !this.shadowDoms.size) {
      return;
    }
    const rafCallback = (timestamp) => {
      this.takeSnapshot(timestamp, false);
      rafId = onRequestAnimationFrame(rafCallback);
    };
    rafId = onRequestAnimationFrame(rafCallback);
    this.restoreHandlers.push(() => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    });
  }
  initCanvasMutationObserver(win, blockClass, blockSelector, unblockSelector) {
    const canvasContextReset = initCanvasContextObserver(
      win,
      blockClass,
      blockSelector,
      unblockSelector,
      false
    );
    const canvas2DReset = initCanvas2DMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector,
      unblockSelector
    );
    const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector,
      unblockSelector,
      this.mirror
    );
    this.restoreHandlers.push(() => {
      canvasContextReset();
      canvas2DReset();
      canvasWebGL1and2Reset();
    });
  }
  /**
   * Returns all `canvas` elements that are not blocked by the given selectors. Searches all windows and shadow roots.
   */
  getCanvasElements(blockClass, blockSelector, unblockSelector) {
    const matchedCanvas = [];
    const searchCanvas = (root) => {
      root.querySelectorAll("canvas").forEach((canvas) => {
        if (!isBlocked(canvas, blockClass, blockSelector, unblockSelector, true)) {
          matchedCanvas.push(canvas);
        }
      });
    };
    for (const item of this.windows) {
      const window2 = item.deref();
      let _document;
      try {
        _document = window2 && window2.document;
      } catch {
      }
      if (_document) {
        searchCanvas(_document);
      }
    }
    for (const item of this.shadowDoms) {
      const shadowRoot = item.deref();
      if (shadowRoot) {
        searchCanvas(shadowRoot);
      }
    }
    return matchedCanvas;
  }
  /**
   * Takes a snapshot of the provided canvas element, or will search all windows/shadow roots for canvases. Will self-throttle based on `options.sampling`.
   *
   * @returns `true` if the snapshot was taken, `false` if it was throttled.
   */
  takeSnapshot(timestamp, isManualSnapshot, canvasElement) {
    const {
      sampling,
      blockClass,
      blockSelector,
      unblockSelector,
      dataURLOptions,
      maxCanvasSize
    } = this.options;
    const fps = sampling === "all" ? 2 : sampling || 2;
    const timeBetweenSnapshots = 1e3 / fps;
    const shouldThrottle = this.lastSnapshotTime && timestamp - this.lastSnapshotTime < timeBetweenSnapshots;
    if (shouldThrottle) {
      return false;
    }
    this.lastSnapshotTime = timestamp;
    const canvases = canvasElement ? [canvasElement] : this.getCanvasElements(blockClass, blockSelector, unblockSelector);
    canvases.forEach((canvas) => {
      const id = this.mirror.getId(canvas);
      if (!this.mirror.hasNode(canvas) || !canvas.width || !canvas.height || this.snapshotInProgressMap.get(id)) {
        return;
      }
      this.snapshotInProgressMap.set(id, true);
      if (!isManualSnapshot && ["webgl", "webgl2"].includes(canvas.__context)) {
        const context = canvas.getContext(canvas.__context);
        if (context?.getContextAttributes()?.preserveDrawingBuffer === false) {
          context.clear(context.COLOR_BUFFER_BIT);
        }
      }
      createImageBitmap(canvas).then((bitmap) => {
        this.worker?.postMessage(
          {
            id,
            bitmap,
            width: canvas.width,
            height: canvas.height,
            dataURLOptions,
            maxCanvasSize
          },
          [bitmap]
        );
      }).catch((error) => {
        callbackWrapper(() => {
          this.snapshotInProgressMap.delete(id);
          throw error;
        })();
      });
    });
    return true;
  }
  startPendingCanvasMutationFlusher() {
    onRequestAnimationFrame(() => this.flushPendingCanvasMutations());
  }
  startRAFTimestamping() {
    const setLatestRAFTimestamp = (timestamp) => {
      this.rafStamps.latestId = timestamp;
      onRequestAnimationFrame(setLatestRAFTimestamp);
    };
    onRequestAnimationFrame(setLatestRAFTimestamp);
  }
  flushPendingCanvasMutations() {
    this.pendingCanvasMutations.forEach(
      (_values, canvas) => {
        const id = this.mirror.getId(canvas);
        this.flushPendingCanvasMutationFor(canvas, id);
      }
    );
    onRequestAnimationFrame(() => this.flushPendingCanvasMutations());
  }
  flushPendingCanvasMutationFor(canvas, id) {
    if (this.frozen || this.locked) {
      return;
    }
    const valuesWithType = this.pendingCanvasMutations.get(canvas);
    if (!valuesWithType || id === -1) return;
    const values = valuesWithType.map((value) => {
      const { type: type2, ...rest } = value;
      return rest;
    });
    const { type } = valuesWithType[0];
    this.mutationCb({ id, type, commands: values });
    this.pendingCanvasMutations.delete(canvas);
  }
}
try {
  if (Array.from([1], (x) => x * 2)[0] !== 2) {
    const cleanFrame = document.createElement("iframe");
    document.body.appendChild(cleanFrame);
    Array.from = cleanFrame.contentWindow?.Array.from || Array.from;
    document.body.removeChild(cleanFrame);
  }
} catch (err) {
  console.debug("Unable to override Array.from", err);
}
createMirror$2();
var n;
!function(t2) {
  t2[t2.NotStarted = 0] = "NotStarted", t2[t2.Running = 1] = "Running", t2[t2.Stopped = 2] = "Stopped";
}(n || (n = {}));

const CANVAS_QUALITY = {
  low: {
    sampling: {
      canvas: 1,
    },
    dataURLOptions: {
      type: 'image/webp',
      quality: 0.25,
    },
  },
  medium: {
    sampling: {
      canvas: 2,
    },
    dataURLOptions: {
      type: 'image/webp',
      quality: 0.4,
    },
  },
  high: {
    sampling: {
      canvas: 4,
    },
    dataURLOptions: {
      type: 'image/webp',
      quality: 0.5,
    },
  },
};

const INTEGRATION_NAME = 'ReplayCanvas';
const DEFAULT_MAX_CANVAS_SIZE = 1280;

/** Exported only for type safe tests. */
const _replayCanvasIntegration = ((options = {}) => {
  const [maxCanvasWidth, maxCanvasHeight] = options.maxCanvasSize || [];
  const _canvasOptions = {
    quality: options.quality || 'medium',
    enableManualSnapshot: options.enableManualSnapshot,
    maxCanvasSize: [
      maxCanvasWidth ? Math.min(maxCanvasWidth, DEFAULT_MAX_CANVAS_SIZE) : DEFAULT_MAX_CANVAS_SIZE,
      maxCanvasHeight ? Math.min(maxCanvasHeight, DEFAULT_MAX_CANVAS_SIZE) : DEFAULT_MAX_CANVAS_SIZE,
    ] ,
  };

  let currentCanvasManager;
  let canvasManagerResolve;
  const _canvasManager = new Promise(resolve => (canvasManagerResolve = resolve));

  return {
    name: INTEGRATION_NAME,
    getOptions() {
      const { quality, enableManualSnapshot, maxCanvasSize } = _canvasOptions;

      return {
        enableManualSnapshot,
        recordCanvas: true,
        getCanvasManager: (getCanvasManagerOptions) => {
          const manager = new CanvasManager({
            ...getCanvasManagerOptions,
            enableManualSnapshot,
            maxCanvasSize,
            errorHandler: (err) => {
              try {
                if (typeof err === 'object') {
                  (err ).__rrweb__ = true;
                }
              } catch {
                // ignore errors here
                // this can happen if the error is frozen or does not allow mutation for other reasons
              }
            },
          });

          currentCanvasManager = manager;

          // Resolve promise on first call for backward compatibility
          canvasManagerResolve(manager);

          return manager;
        },
        ...(CANVAS_QUALITY[quality] || CANVAS_QUALITY.medium),
      };
    },
    async snapshot(canvasElement, options) {
      const canvasManager = currentCanvasManager || (await _canvasManager);

      canvasManager.snapshot(canvasElement, options);
    },
  };
}) ;

/**
 * Add this in addition to `replayIntegration()` to enable canvas recording.
 */
const replayCanvasIntegration = core.defineIntegration(
  _replayCanvasIntegration,
) ;

exports.replayCanvasIntegration = replayCanvasIntegration;
//# sourceMappingURL=index.js.map
