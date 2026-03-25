import { openBlock as b, createElementBlock as h, pushScopeId as L, popScopeId as $, createElementVNode as a, ref as v, toRefs as w, onMounted as H, onUnmounted as N, renderSlot as u, createVNode as O, createCommentVNode as p, toDisplayString as m, watch as g, nextTick as R } from "vue";
const E = (e, o) => {
  const t = e.__vccOpts || e;
  for (const [n, s] of o)
    t[n] = s;
  return t;
}, C = {}, j = (e) => (L("data-v-259be2b2"), e = e(), $(), e), M = { class: "container" }, T = /* @__PURE__ */ j(() => /* @__PURE__ */ a("div", { class: "spinner" }, null, -1)), V = [
  T
];
function W(e, o) {
  return b(), h("div", M, V);
}
const D = /* @__PURE__ */ E(C, [["render", W], ["__scopeId", "data-v-259be2b2"], ["__file", "/home/oumoussa/side-projects/infinite/src/components/Spinner.vue"]]), U = (e) => ({
  loading() {
    e.value = "loading";
  },
  loaded() {
    e.value = "loaded";
  },
  complete() {
    e.value = "complete";
  },
  error() {
    e.value = "error";
  }
}), z = (e, o, t) => () => {
  const n = t.parentEl || document.documentElement;
  t.prevHeight = n.scrollHeight, o.loading(), e("infinite", o);
}, A = (e, o) => {
  const t = e.getBoundingClientRect();
  if (!o)
    return t.top >= 0 && t.bottom <= window.innerHeight;
  const n = o.getBoundingClientRect();
  return t.top >= n.top && t.bottom <= n.bottom;
}, y = (e) => {
  e.parentEl = document.querySelector(e.target) || null;
  let o = `0px 0px ${e.distance}px 0px`;
  e.top && (o = `${e.distance}px 0px 0px 0px`);
  const t = new IntersectionObserver(
    (n) => {
      n[0].isIntersecting && (e.firstload && e.emit(), e.firstload = !0);
    },
    { root: e.parentEl, rootMargin: o }
  );
  return t.observe(e.infiniteLoading.value), t;
};
const F = { class: "state-error" }, G = {
  __name: "InfiniteLoading",
  props: {
    top: { type: Boolean, required: !1 },
    target: { type: [String, Boolean], required: !1 },
    distance: { type: Number, required: !1, default: 0 },
    identifier: { required: !1 },
    firstload: { type: Boolean, required: !1, default: !0 },
    slots: { type: Object, required: !1 }
  },
  emits: ["infinite"],
  setup(e, { emit: o }) {
    const t = e;
    let n = null;
    const s = v(null), l = v("ready"), { top: f, firstload: x, target: I, distance: S } = t, { identifier: _ } = w(t), i = {
      infiniteLoading: s,
      target: I,
      top: f,
      firstload: x,
      distance: S,
      prevHeight: 0,
      parentEl: null
    };
    i.emit = z(o, U(l), i);
    const k = () => g(l, async (r) => {
      const c = i.parentEl || document.documentElement;
      await R(), r == "loaded" && f && (c.scrollTop = c.scrollHeight - i.prevHeight), r == "loaded" && A(s.value, i.parentEl) && i.emit(), r == "complete" && n.disconnect();
    }), q = () => g(_, () => {
      l.value = "ready", n.disconnect(), n = y(i);
    });
    return H(() => {
      n = y(i), k(), _ && q();
    }), N(() => {
      n.disconnect();
    }), (r, c) => (b(), h("div", {
      ref_key: "infiniteLoading",
      ref: s
    }, [
      l.value == "loading" ? u(r.$slots, "spinner", { key: 0 }, () => [
        O(D)
      ], !0) : p("v-if", !0),
      l.value == "complete" ? u(r.$slots, "complete", { key: 1 }, () => {
        var d;
        return [
          a("span", null, m(((d = e.slots) == null ? void 0 : d.complete) || "No more results!"), 1)
        ];
      }, !0) : p("v-if", !0),
      l.value == "error" ? u(r.$slots, "error", {
        key: 2,
        retry: i.emit
      }, () => {
        var d;
        return [
          a("span", F, [
            a("span", null, m(((d = e.slots) == null ? void 0 : d.error) || "Oops something went wrong!"), 1),
            a("button", {
              class: "retry",
              onClick: c[0] || (c[0] = (...B) => i.emit && i.emit(...B))
            }, " retry ")
          ])
        ];
      }, !0) : p("v-if", !0)
    ], 512));
  }
}, K = /* @__PURE__ */ E(G, [["__scopeId", "data-v-9d82030b"], ["__file", "/home/oumoussa/side-projects/infinite/src/components/InfiniteLoading.vue"]]);
export {
  K as default
};
