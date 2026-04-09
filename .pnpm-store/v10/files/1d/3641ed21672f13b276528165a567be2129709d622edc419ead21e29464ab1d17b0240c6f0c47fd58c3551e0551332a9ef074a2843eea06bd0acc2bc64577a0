var g = Object.defineProperty;
var t = (A, o) => g(A, "name", { value: o, configurable: !0 });

// src/storybook-error.ts
function E({
  code: A,
  category: o
}) {
  let e = String(A).padStart(4, "0");
  return `SB_${o}_${e}`;
}
t(E, "parseErrorCode");
var c = class c extends Error {
  constructor(e) {
    super(c.getFullMessage(e));
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    this.data = {};
    /** Flag used to easily determine if the error originates from Storybook. */
    this.fromStorybook = !0;
    this.category = e.category, this.documentation = e.documentation ?? !1, this.code = e.code;
  }
  get fullErrorCode() {
    return E({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let e = this.constructor.name;
    return `${this.fullErrorCode} (${e})`;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation: e,
    code: u,
    category: d,
    message: G
  }) {
    let s;
    return e === !0 ? s = `https://storybook.js.org/error/${E({ code: u, category: d })}` : typeof e == "string" ? s = e : Array.isArray(e) &&
    (s = `
${e.map((R) => `	- ${R}`).join(`
`)}`), `${G}${s != null ? `

More info: ${s}
` : ""}`;
  }
};
t(c, "StorybookError");
var n = c;

// src/manager-errors.ts
var M = /* @__PURE__ */ ((r) => (r.MANAGER_UNCAUGHT = "MANAGER_UNCAUGHT", r.MANAGER_UI = "MANAGER_UI", r.MANAGER_API = "MANAGER_API", r.MANAGER_CLIENT_LOGGER =
"MANAGER_CLIENT-LOGGER", r.MANAGER_CHANNELS = "MANAGER_CHANNELS", r.MANAGER_CORE_EVENTS = "MANAGER_CORE-EVENTS", r.MANAGER_ROUTER = "MANAGER\
_ROUTER", r.MANAGER_THEMING = "MANAGER_THEMING", r))(M || {}), i = class i extends n {
  constructor() {
    super({
      category: "MANAGER_UI",
      code: 1,
      message: "The Provider passed into Storybook's UI is not extended from the base Provider. Please check your Provider implementation."
    });
  }
};
t(i, "ProviderDoesNotExtendBaseProviderError");
var l = i, a = class a extends n {
  constructor(e) {
    super({
      category: "MANAGER_UNCAUGHT",
      code: 1,
      message: e.error.message
    });
    this.data = e;
    this.stack = e.error.stack;
  }
};
t(a, "UncaughtManagerError");
var N = a;
export {
  M as Category,
  l as ProviderDoesNotExtendBaseProviderError,
  N as UncaughtManagerError
};
