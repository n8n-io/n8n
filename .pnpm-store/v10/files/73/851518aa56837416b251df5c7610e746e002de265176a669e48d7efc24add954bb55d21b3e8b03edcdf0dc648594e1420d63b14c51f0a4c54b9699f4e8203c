'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var iconsVue = require('@element-plus/icons-vue');
require('../../../../hooks/index.js');
var pager = require('./pager.js');
var pluginVue_exportHelper = require('../../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../../hooks/use-namespace/index.js');
var index$1 = require('../../../../hooks/use-locale/index.js');

const _hoisted_1 = ["onKeyup"];
const _hoisted_2 = ["aria-current", "aria-label", "tabindex"];
const _hoisted_3 = ["tabindex", "aria-label"];
const _hoisted_4 = ["aria-current", "aria-label", "tabindex"];
const _hoisted_5 = ["tabindex", "aria-label"];
const _hoisted_6 = ["aria-current", "aria-label", "tabindex"];
const __default__ = vue.defineComponent({
  name: "ElPaginationPager"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: pager.paginationPagerProps,
  emits: ["change"],
  setup(__props, { emit }) {
    const props = __props;
    const nsPager = index.useNamespace("pager");
    const nsIcon = index.useNamespace("icon");
    const { t } = index$1.useLocale();
    const showPrevMore = vue.ref(false);
    const showNextMore = vue.ref(false);
    const quickPrevHover = vue.ref(false);
    const quickNextHover = vue.ref(false);
    const quickPrevFocus = vue.ref(false);
    const quickNextFocus = vue.ref(false);
    const pagers = vue.computed(() => {
      const pagerCount = props.pagerCount;
      const halfPagerCount = (pagerCount - 1) / 2;
      const currentPage = Number(props.currentPage);
      const pageCount = Number(props.pageCount);
      let showPrevMore2 = false;
      let showNextMore2 = false;
      if (pageCount > pagerCount) {
        if (currentPage > pagerCount - halfPagerCount) {
          showPrevMore2 = true;
        }
        if (currentPage < pageCount - halfPagerCount) {
          showNextMore2 = true;
        }
      }
      const array = [];
      if (showPrevMore2 && !showNextMore2) {
        const startPage = pageCount - (pagerCount - 2);
        for (let i = startPage; i < pageCount; i++) {
          array.push(i);
        }
      } else if (!showPrevMore2 && showNextMore2) {
        for (let i = 2; i < pagerCount; i++) {
          array.push(i);
        }
      } else if (showPrevMore2 && showNextMore2) {
        const offset = Math.floor(pagerCount / 2) - 1;
        for (let i = currentPage - offset; i <= currentPage + offset; i++) {
          array.push(i);
        }
      } else {
        for (let i = 2; i < pageCount; i++) {
          array.push(i);
        }
      }
      return array;
    });
    const prevMoreKls = vue.computed(() => [
      "more",
      "btn-quickprev",
      nsIcon.b(),
      nsPager.is("disabled", props.disabled)
    ]);
    const nextMoreKls = vue.computed(() => [
      "more",
      "btn-quicknext",
      nsIcon.b(),
      nsPager.is("disabled", props.disabled)
    ]);
    const tabindex = vue.computed(() => props.disabled ? -1 : 0);
    vue.watchEffect(() => {
      const halfPagerCount = (props.pagerCount - 1) / 2;
      showPrevMore.value = false;
      showNextMore.value = false;
      if (props.pageCount > props.pagerCount) {
        if (props.currentPage > props.pagerCount - halfPagerCount) {
          showPrevMore.value = true;
        }
        if (props.currentPage < props.pageCount - halfPagerCount) {
          showNextMore.value = true;
        }
      }
    });
    function onMouseEnter(forward = false) {
      if (props.disabled)
        return;
      if (forward) {
        quickPrevHover.value = true;
      } else {
        quickNextHover.value = true;
      }
    }
    function onFocus(forward = false) {
      if (forward) {
        quickPrevFocus.value = true;
      } else {
        quickNextFocus.value = true;
      }
    }
    function onEnter(e) {
      const target = e.target;
      if (target.tagName.toLowerCase() === "li" && Array.from(target.classList).includes("number")) {
        const newPage = Number(target.textContent);
        if (newPage !== props.currentPage) {
          emit("change", newPage);
        }
      } else if (target.tagName.toLowerCase() === "li" && Array.from(target.classList).includes("more")) {
        onPagerClick(e);
      }
    }
    function onPagerClick(event) {
      const target = event.target;
      if (target.tagName.toLowerCase() === "ul" || props.disabled) {
        return;
      }
      let newPage = Number(target.textContent);
      const pageCount = props.pageCount;
      const currentPage = props.currentPage;
      const pagerCountOffset = props.pagerCount - 2;
      if (target.className.includes("more")) {
        if (target.className.includes("quickprev")) {
          newPage = currentPage - pagerCountOffset;
        } else if (target.className.includes("quicknext")) {
          newPage = currentPage + pagerCountOffset;
        }
      }
      if (!Number.isNaN(+newPage)) {
        if (newPage < 1) {
          newPage = 1;
        }
        if (newPage > pageCount) {
          newPage = pageCount;
        }
      }
      if (newPage !== currentPage) {
        emit("change", newPage);
      }
    }
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("ul", {
        class: vue.normalizeClass(vue.unref(nsPager).b()),
        onClick: onPagerClick,
        onKeyup: vue.withKeys(onEnter, ["enter"])
      }, [
        _ctx.pageCount > 0 ? (vue.openBlock(), vue.createElementBlock("li", {
          key: 0,
          class: vue.normalizeClass([[
            vue.unref(nsPager).is("active", _ctx.currentPage === 1),
            vue.unref(nsPager).is("disabled", _ctx.disabled)
          ], "number"]),
          "aria-current": _ctx.currentPage === 1,
          "aria-label": vue.unref(t)("el.pagination.currentPage", { pager: 1 }),
          tabindex: vue.unref(tabindex)
        }, " 1 ", 10, _hoisted_2)) : vue.createCommentVNode("v-if", true),
        showPrevMore.value ? (vue.openBlock(), vue.createElementBlock("li", {
          key: 1,
          class: vue.normalizeClass(vue.unref(prevMoreKls)),
          tabindex: vue.unref(tabindex),
          "aria-label": vue.unref(t)("el.pagination.prevPages", { pager: _ctx.pagerCount - 2 }),
          onMouseenter: _cache[0] || (_cache[0] = ($event) => onMouseEnter(true)),
          onMouseleave: _cache[1] || (_cache[1] = ($event) => quickPrevHover.value = false),
          onFocus: _cache[2] || (_cache[2] = ($event) => onFocus(true)),
          onBlur: _cache[3] || (_cache[3] = ($event) => quickPrevFocus.value = false)
        }, [
          (quickPrevHover.value || quickPrevFocus.value) && !_ctx.disabled ? (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.DArrowLeft), { key: 0 })) : (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.MoreFilled), { key: 1 }))
        ], 42, _hoisted_3)) : vue.createCommentVNode("v-if", true),
        (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(vue.unref(pagers), (pager) => {
          return vue.openBlock(), vue.createElementBlock("li", {
            key: pager,
            class: vue.normalizeClass([[
              vue.unref(nsPager).is("active", _ctx.currentPage === pager),
              vue.unref(nsPager).is("disabled", _ctx.disabled)
            ], "number"]),
            "aria-current": _ctx.currentPage === pager,
            "aria-label": vue.unref(t)("el.pagination.currentPage", { pager }),
            tabindex: vue.unref(tabindex)
          }, vue.toDisplayString(pager), 11, _hoisted_4);
        }), 128)),
        showNextMore.value ? (vue.openBlock(), vue.createElementBlock("li", {
          key: 2,
          class: vue.normalizeClass(vue.unref(nextMoreKls)),
          tabindex: vue.unref(tabindex),
          "aria-label": vue.unref(t)("el.pagination.nextPages", { pager: _ctx.pagerCount - 2 }),
          onMouseenter: _cache[4] || (_cache[4] = ($event) => onMouseEnter()),
          onMouseleave: _cache[5] || (_cache[5] = ($event) => quickNextHover.value = false),
          onFocus: _cache[6] || (_cache[6] = ($event) => onFocus()),
          onBlur: _cache[7] || (_cache[7] = ($event) => quickNextFocus.value = false)
        }, [
          (quickNextHover.value || quickNextFocus.value) && !_ctx.disabled ? (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.DArrowRight), { key: 0 })) : (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.MoreFilled), { key: 1 }))
        ], 42, _hoisted_5)) : vue.createCommentVNode("v-if", true),
        _ctx.pageCount > 1 ? (vue.openBlock(), vue.createElementBlock("li", {
          key: 3,
          class: vue.normalizeClass([[
            vue.unref(nsPager).is("active", _ctx.currentPage === _ctx.pageCount),
            vue.unref(nsPager).is("disabled", _ctx.disabled)
          ], "number"]),
          "aria-current": _ctx.currentPage === _ctx.pageCount,
          "aria-label": vue.unref(t)("el.pagination.currentPage", { pager: _ctx.pageCount }),
          tabindex: vue.unref(tabindex)
        }, vue.toDisplayString(_ctx.pageCount), 11, _hoisted_6)) : vue.createCommentVNode("v-if", true)
      ], 42, _hoisted_1);
    };
  }
});
var Pager = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/pager.vue"]]);

exports["default"] = Pager;
//# sourceMappingURL=pager2.js.map
