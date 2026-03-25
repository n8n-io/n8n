'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../utils/index.js');
require('../../../../constants/index.js');
var aria = require('../../../../constants/aria.js');
var aria$1 = require('../../../../utils/dom/aria.js');

class SubMenu {
  constructor(parent, domNode) {
    this.parent = parent;
    this.domNode = domNode;
    this.subIndex = 0;
    this.subIndex = 0;
    this.init();
  }
  init() {
    this.subMenuItems = this.domNode.querySelectorAll("li");
    this.addListeners();
  }
  gotoSubIndex(idx) {
    if (idx === this.subMenuItems.length) {
      idx = 0;
    } else if (idx < 0) {
      idx = this.subMenuItems.length - 1;
    }
    ;
    this.subMenuItems[idx].focus();
    this.subIndex = idx;
  }
  addListeners() {
    const parentNode = this.parent.domNode;
    Array.prototype.forEach.call(this.subMenuItems, (el) => {
      el.addEventListener("keydown", (event) => {
        let prevDef = false;
        switch (event.code) {
          case aria.EVENT_CODE.down: {
            this.gotoSubIndex(this.subIndex + 1);
            prevDef = true;
            break;
          }
          case aria.EVENT_CODE.up: {
            this.gotoSubIndex(this.subIndex - 1);
            prevDef = true;
            break;
          }
          case aria.EVENT_CODE.tab: {
            aria$1.triggerEvent(parentNode, "mouseleave");
            break;
          }
          case aria.EVENT_CODE.enter:
          case aria.EVENT_CODE.space: {
            prevDef = true;
            event.currentTarget.click();
            break;
          }
        }
        if (prevDef) {
          event.preventDefault();
          event.stopPropagation();
        }
        return false;
      });
    });
  }
}

exports["default"] = SubMenu;
//# sourceMappingURL=submenu.js.map
