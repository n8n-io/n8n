'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var index = require('../../../hooks/use-namespace/index.js');

const Timeline = vue.defineComponent({
  name: "ElTimeline",
  setup(_, { slots }) {
    const ns = index.useNamespace("timeline");
    vue.provide("timeline", slots);
    return () => {
      return vue.h("ul", { class: [ns.b()] }, [vue.renderSlot(slots, "default")]);
    };
  }
});

exports["default"] = Timeline;
//# sourceMappingURL=timeline.js.map
