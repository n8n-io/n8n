'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
require('../../../../hooks/index.js');
var layoutObserver = require('../layout-observer.js');
var util = require('../util.js');
var tokens = require('../tokens.js');
var renderHelper = require('./render-helper.js');
var defaults = require('./defaults.js');
var index = require('../../../../hooks/use-namespace/index.js');
var core = require('@vueuse/core');
var raf = require('../../../../utils/raf.js');
var style = require('../../../../utils/dom/style.js');

var TableBody = vue.defineComponent({
  name: "ElTableBody",
  props: defaults["default"],
  setup(props) {
    const instance = vue.getCurrentInstance();
    const parent = vue.inject(tokens.TABLE_INJECTION_KEY);
    const ns = index.useNamespace("table");
    const { wrappedRowRender, tooltipContent, tooltipTrigger } = renderHelper["default"](props);
    const { onColumnsChange, onScrollableChange } = layoutObserver["default"](parent);
    vue.watch(props.store.states.hoverRow, (newVal, oldVal) => {
      if (!props.store.states.isComplex.value || !core.isClient)
        return;
      raf.rAF(() => {
        const el = instance == null ? void 0 : instance.vnode.el;
        const rows = Array.from((el == null ? void 0 : el.children) || []).filter((e) => e == null ? void 0 : e.classList.contains(`${ns.e("row")}`));
        const oldRow = rows[oldVal];
        const newRow = rows[newVal];
        if (oldRow) {
          style.removeClass(oldRow, "hover-row");
        }
        if (newRow) {
          style.addClass(newRow, "hover-row");
        }
      });
    });
    vue.onUnmounted(() => {
      var _a;
      (_a = util.removePopper) == null ? void 0 : _a();
    });
    return {
      ns,
      onColumnsChange,
      onScrollableChange,
      wrappedRowRender,
      tooltipContent,
      tooltipTrigger
    };
  },
  render() {
    const { wrappedRowRender, store } = this;
    const data = store.states.data.value || [];
    return vue.h("tbody", { tabIndex: -1 }, [
      data.reduce((acc, row) => {
        return acc.concat(wrappedRowRender(row, acc.length));
      }, [])
    ]);
  }
});

exports["default"] = TableBody;
//# sourceMappingURL=index.js.map
