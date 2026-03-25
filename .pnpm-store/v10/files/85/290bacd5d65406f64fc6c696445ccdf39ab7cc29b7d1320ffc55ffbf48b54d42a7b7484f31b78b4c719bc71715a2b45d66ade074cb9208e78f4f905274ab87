'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../../../utils/index.js');
require('../../../../constants/index.js');
var submenu = require('./submenu.js');
var aria = require('../../../../constants/aria.js');
var aria$1 = require('../../../../utils/dom/aria.js');

class MenuItem {
  constructor(domNode, namespace) {
    this.domNode = domNode;
    this.submenu = null;
    this.submenu = null;
    this.init(namespace);
  }
  init(namespace) {
    this.domNode.setAttribute("tabindex", "0");
    const menuChild = this.domNode.querySelector(`.${namespace}-menu`);
    if (menuChild) {
      this.submenu = new submenu["default"](this, menuChild);
    }
    this.addListeners();
  }
  addListeners() {
    this.domNode.addEventListener("keydown", (event) => {
      let prevDef = false;
      switch (event.code) {
        case aria.EVENT_CODE.down: {
          aria$1.triggerEvent(event.currentTarget, "mouseenter");
          this.submenu && this.submenu.gotoSubIndex(0);
          prevDef = true;
          break;
        }
        case aria.EVENT_CODE.up: {
          aria$1.triggerEvent(event.currentTarget, "mouseenter");
          this.submenu && this.submenu.gotoSubIndex(this.submenu.subMenuItems.length - 1);
          prevDef = true;
          break;
        }
        case aria.EVENT_CODE.tab: {
          aria$1.triggerEvent(event.currentTarget, "mouseleave");
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
      }
    });
  }
}

exports["default"] = MenuItem;
//# sourceMappingURL=menu-item.js.map
