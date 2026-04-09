import { nextTick as h, openBlock as w, createElementBlock as E, pushScopeId as B, popScopeId as H, createElementVNode as c, defineComponent as C, ref as v, toRefs as O, watch as R, onMounted as N, onUnmounted as V, withDirectives as M, renderSlot as u, createVNode as T, vShow as D, toDisplayString as g, createCommentVNode as m } from "vue";
function P(e, o = null) {
  if (!e)
    return !1;
  const n = e.getBoundingClientRect(), t = o ? o.getBoundingClientRect() : { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
  return n.bottom >= t.top && n.top <= t.bottom && n.right >= t.left && n.left <= t.right;
}
async function q(e) {
  return e ? (await h(), e.value instanceof HTMLElement ? e.value : e.value ? document.querySelector(e.value) : null) : null;
}
function U(e) {
  let o = `0px 0px ${e.distance}px 0px`;
  e.top && (o = `${e.distance}px 0px 0px 0px`);
  const n = new IntersectionObserver(
    (t) => {
      t[0].isIntersecting && (e.firstload && e.emit(), e.firstload = !0);
    },
    { root: e.parentEl, rootMargin: o }
  );
  return e.infiniteLoading.value && n.observe(e.infiniteLoading.value), n;
}
async function y(e, o) {
  if (await h(), !e.top)
    return;
  const n = e.parentEl || document.documentElement;
  n.scrollTop = n.scrollHeight - o;
}
const x = (e, o) => {
  const n = e.__vccOpts || e;
  for (const [t, r] of o)
    n[t] = r;
  return n;
}, W = {}, j = (e) => (B("data-v-d3e37633"), e = e(), H(), e), z = { class: "container" }, A = /* @__PURE__ */ j(() => /* @__PURE__ */ c("div", { class: "spinner" }, null, -1)), F = [
  A
];
function G(e, o) {
  return w(), E("div", z, F);
}
const J = /* @__PURE__ */ x(W, [["render", G], ["__scopeId", "data-v-d3e37633"]]), K = { class: "state-error" }, Q = /* @__PURE__ */ C({
  __name: "InfiniteLoading",
  props: {
    top: { type: Boolean, default: !1 },
    target: {},
    distance: { default: 0 },
    identifier: {},
    firstload: { type: Boolean, default: !0 },
    slots: {}
  },
  emits: ["infinite"],
  setup(e, { emit: o }) {
    const n = e;
    let t = null, r = 0;
    const d = v(null), l = v(""), { top: I, firstload: S, distance: k } = n, { identifier: L, target: b } = O(n), i = {
      infiniteLoading: d,
      top: I,
      firstload: S,
      distance: k,
      parentEl: null,
      emit() {
        r = (i.parentEl || document.documentElement).scrollHeight, p.loading(), o("infinite", p);
      }
    }, p = {
      loading() {
        l.value = "loading";
      },
      async loaded() {
        l.value = "loaded", await y(i, r), P(d.value, i.parentEl) && i.emit();
      },
      async complete() {
        l.value = "complete", await y(i, r), t == null || t.disconnect();
      },
      error() {
        l.value = "error";
      }
    };
    function f() {
      t == null || t.disconnect(), t = U(i);
    }
    return R(L, f), N(async () => {
      i.parentEl = await q(b), f();
    }), V(() => t == null ? void 0 : t.disconnect()), (s, _) => (w(), E("div", {
      ref_key: "infiniteLoading",
      ref: d,
      class: "v3-infinite-loading"
    }, [
      M(c("div", null, [
        u(s.$slots, "spinner", {}, () => [
          T(J)
        ], !0)
      ], 512), [
        [D, l.value == "loading"]
      ]),
      l.value == "complete" ? u(s.$slots, "complete", { key: 0 }, () => {
        var a;
        return [
          c("span", null, g(((a = s.slots) == null ? void 0 : a.complete) || "No more results!"), 1)
        ];
      }, !0) : m("", !0),
      l.value == "error" ? u(s.$slots, "error", {
        key: 1,
        retry: i.emit
      }, () => {
        var a;
        return [
          c("span", K, [
            c("span", null, g(((a = s.slots) == null ? void 0 : a.error) || "Oops something went wrong!"), 1),
            c("button", {
              class: "retry",
              onClick: _[0] || (_[0] = //@ts-ignore
              (...$) => i.emit && i.emit(...$))
            }, "retry")
          ])
        ];
      }, !0) : m("", !0)
    ], 512));
  }
});
const Y = /* @__PURE__ */ x(Q, [["__scopeId", "data-v-4bdee133"]]);
export {
  Y as default
};
