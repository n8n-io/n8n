'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const attachEvents = (el, binding) => {
  const popperComponent = binding.arg || binding.value;
  const popover = popperComponent == null ? void 0 : popperComponent.popperRef;
  if (popover) {
    popover.triggerRef = el;
  }
};
var PopoverDirective = {
  mounted(el, binding) {
    attachEvents(el, binding);
  },
  updated(el, binding) {
    attachEvents(el, binding);
  }
};
const VPopover = "popover";

exports.VPopover = VPopover;
exports["default"] = PopoverDirective;
//# sourceMappingURL=directive.js.map
