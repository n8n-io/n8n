'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var index = require('../../../hooks/use-namespace/index.js');

var NodeContent = vue.defineComponent({
  name: "NodeContent",
  setup() {
    const ns = index.useNamespace("cascader-node");
    return {
      ns
    };
  },
  render() {
    const { ns } = this;
    const { node, panel } = this.$parent;
    const { data, label } = node;
    const { renderLabelFn } = panel;
    return vue.h("span", { class: ns.e("label") }, renderLabelFn ? renderLabelFn({ node, data }) : label);
  }
});

exports["default"] = NodeContent;
//# sourceMappingURL=node-content.js.map
