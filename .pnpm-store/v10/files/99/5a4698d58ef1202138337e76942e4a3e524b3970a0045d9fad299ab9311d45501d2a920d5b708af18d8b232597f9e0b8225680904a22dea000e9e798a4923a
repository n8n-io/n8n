'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var iconsVue = require('@element-plus/icons-vue');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var prev = require('./components/prev2.js');
var next = require('./components/next2.js');
var sizes = require('./components/sizes2.js');
var jumper = require('./components/jumper2.js');
var total = require('./components/total2.js');
var pager = require('./components/pager2.js');
var runtime = require('../../../utils/vue/props/runtime.js');
var types = require('../../../utils/types.js');
var typescript = require('../../../utils/typescript.js');
var icon = require('../../../utils/vue/icon.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var error = require('../../../utils/error.js');

const isAbsent = (v) => typeof v !== "number";
const paginationProps = runtime.buildProps({
  pageSize: Number,
  defaultPageSize: Number,
  total: Number,
  pageCount: Number,
  pagerCount: {
    type: Number,
    validator: (value) => {
      return types.isNumber(value) && Math.trunc(value) === value && value > 4 && value < 22 && value % 2 === 1;
    },
    default: 7
  },
  currentPage: Number,
  defaultCurrentPage: Number,
  layout: {
    type: String,
    default: ["prev", "pager", "next", "jumper", "->", "total"].join(", ")
  },
  pageSizes: {
    type: runtime.definePropType(Array),
    default: () => typescript.mutable([10, 20, 30, 40, 50, 100])
  },
  popperClass: {
    type: String,
    default: ""
  },
  prevText: {
    type: String,
    default: ""
  },
  prevIcon: {
    type: icon.iconPropType,
    default: () => iconsVue.ArrowLeft
  },
  nextText: {
    type: String,
    default: ""
  },
  nextIcon: {
    type: icon.iconPropType,
    default: () => iconsVue.ArrowRight
  },
  teleported: {
    type: Boolean,
    default: true
  },
  small: Boolean,
  background: Boolean,
  disabled: Boolean,
  hideOnSinglePage: Boolean
});
const paginationEmits = {
  "update:current-page": (val) => types.isNumber(val),
  "update:page-size": (val) => types.isNumber(val),
  "size-change": (val) => types.isNumber(val),
  "current-change": (val) => types.isNumber(val),
  "prev-click": (val) => types.isNumber(val),
  "next-click": (val) => types.isNumber(val)
};
const componentName = "ElPagination";
var Pagination = vue.defineComponent({
  name: componentName,
  props: paginationProps,
  emits: paginationEmits,
  setup(props, { emit, slots }) {
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("pagination");
    const vnodeProps = vue.getCurrentInstance().vnode.props || {};
    const hasCurrentPageListener = "onUpdate:currentPage" in vnodeProps || "onUpdate:current-page" in vnodeProps || "onCurrentChange" in vnodeProps;
    const hasPageSizeListener = "onUpdate:pageSize" in vnodeProps || "onUpdate:page-size" in vnodeProps || "onSizeChange" in vnodeProps;
    const assertValidUsage = vue.computed(() => {
      if (isAbsent(props.total) && isAbsent(props.pageCount))
        return false;
      if (!isAbsent(props.currentPage) && !hasCurrentPageListener)
        return false;
      if (props.layout.includes("sizes")) {
        if (!isAbsent(props.pageCount)) {
          if (!hasPageSizeListener)
            return false;
        } else if (!isAbsent(props.total)) {
          if (!isAbsent(props.pageSize)) {
            if (!hasPageSizeListener) {
              return false;
            }
          } else {
          }
        }
      }
      return true;
    });
    const innerPageSize = vue.ref(isAbsent(props.defaultPageSize) ? 10 : props.defaultPageSize);
    const innerCurrentPage = vue.ref(isAbsent(props.defaultCurrentPage) ? 1 : props.defaultCurrentPage);
    const pageSizeBridge = vue.computed({
      get() {
        return isAbsent(props.pageSize) ? innerPageSize.value : props.pageSize;
      },
      set(v) {
        if (isAbsent(props.pageSize)) {
          innerPageSize.value = v;
        }
        if (hasPageSizeListener) {
          emit("update:page-size", v);
          emit("size-change", v);
        }
      }
    });
    const pageCountBridge = vue.computed(() => {
      let pageCount = 0;
      if (!isAbsent(props.pageCount)) {
        pageCount = props.pageCount;
      } else if (!isAbsent(props.total)) {
        pageCount = Math.max(1, Math.ceil(props.total / pageSizeBridge.value));
      }
      return pageCount;
    });
    const currentPageBridge = vue.computed({
      get() {
        return isAbsent(props.currentPage) ? innerCurrentPage.value : props.currentPage;
      },
      set(v) {
        let newCurrentPage = v;
        if (v < 1) {
          newCurrentPage = 1;
        } else if (v > pageCountBridge.value) {
          newCurrentPage = pageCountBridge.value;
        }
        if (isAbsent(props.currentPage)) {
          innerCurrentPage.value = newCurrentPage;
        }
        if (hasCurrentPageListener) {
          emit("update:current-page", newCurrentPage);
          emit("current-change", newCurrentPage);
        }
      }
    });
    vue.watch(pageCountBridge, (val) => {
      if (currentPageBridge.value > val)
        currentPageBridge.value = val;
    });
    function handleCurrentChange(val) {
      currentPageBridge.value = val;
    }
    function handleSizeChange(val) {
      pageSizeBridge.value = val;
      const newPageCount = pageCountBridge.value;
      if (currentPageBridge.value > newPageCount) {
        currentPageBridge.value = newPageCount;
      }
    }
    function prev$1() {
      if (props.disabled)
        return;
      currentPageBridge.value -= 1;
      emit("prev-click", currentPageBridge.value);
    }
    function next$1() {
      if (props.disabled)
        return;
      currentPageBridge.value += 1;
      emit("next-click", currentPageBridge.value);
    }
    function addClass(element, cls) {
      if (element) {
        if (!element.props) {
          element.props = {};
        }
        element.props.class = [element.props.class, cls].join(" ");
      }
    }
    vue.provide(constants.elPaginationKey, {
      pageCount: pageCountBridge,
      disabled: vue.computed(() => props.disabled),
      currentPage: currentPageBridge,
      changeEvent: handleCurrentChange,
      handleSizeChange
    });
    return () => {
      var _a, _b;
      if (!assertValidUsage.value) {
        error.debugWarn(componentName, t("el.pagination.deprecationWarning"));
        return null;
      }
      if (!props.layout)
        return null;
      if (props.hideOnSinglePage && pageCountBridge.value <= 1)
        return null;
      const rootChildren = [];
      const rightWrapperChildren = [];
      const rightWrapperRoot = vue.h("div", { class: ns.e("rightwrapper") }, rightWrapperChildren);
      const TEMPLATE_MAP = {
        prev: vue.h(prev["default"], {
          disabled: props.disabled,
          currentPage: currentPageBridge.value,
          prevText: props.prevText,
          prevIcon: props.prevIcon,
          onClick: prev$1
        }),
        jumper: vue.h(jumper["default"], {
          size: props.small ? "small" : "default"
        }),
        pager: vue.h(pager["default"], {
          currentPage: currentPageBridge.value,
          pageCount: pageCountBridge.value,
          pagerCount: props.pagerCount,
          onChange: handleCurrentChange,
          disabled: props.disabled
        }),
        next: vue.h(next["default"], {
          disabled: props.disabled,
          currentPage: currentPageBridge.value,
          pageCount: pageCountBridge.value,
          nextText: props.nextText,
          nextIcon: props.nextIcon,
          onClick: next$1
        }),
        sizes: vue.h(sizes["default"], {
          pageSize: pageSizeBridge.value,
          pageSizes: props.pageSizes,
          popperClass: props.popperClass,
          disabled: props.disabled,
          teleported: props.teleported,
          size: props.small ? "small" : "default"
        }),
        slot: (_b = (_a = slots == null ? void 0 : slots.default) == null ? void 0 : _a.call(slots)) != null ? _b : null,
        total: vue.h(total["default"], { total: isAbsent(props.total) ? 0 : props.total })
      };
      const components = props.layout.split(",").map((item) => item.trim());
      let haveRightWrapper = false;
      components.forEach((c) => {
        if (c === "->") {
          haveRightWrapper = true;
          return;
        }
        if (!haveRightWrapper) {
          rootChildren.push(TEMPLATE_MAP[c]);
        } else {
          rightWrapperChildren.push(TEMPLATE_MAP[c]);
        }
      });
      addClass(rootChildren[0], ns.is("first"));
      addClass(rootChildren[rootChildren.length - 1], ns.is("last"));
      if (haveRightWrapper && rightWrapperChildren.length > 0) {
        addClass(rightWrapperChildren[0], ns.is("first"));
        addClass(rightWrapperChildren[rightWrapperChildren.length - 1], ns.is("last"));
        rootChildren.push(rightWrapperRoot);
      }
      return vue.h("div", {
        class: [
          ns.b(),
          ns.is("background", props.background),
          {
            [ns.m("small")]: props.small
          }
        ]
      }, rootChildren);
    };
  }
});

exports["default"] = Pagination;
exports.paginationEmits = paginationEmits;
exports.paginationProps = paginationProps;
//# sourceMappingURL=pagination.js.map
