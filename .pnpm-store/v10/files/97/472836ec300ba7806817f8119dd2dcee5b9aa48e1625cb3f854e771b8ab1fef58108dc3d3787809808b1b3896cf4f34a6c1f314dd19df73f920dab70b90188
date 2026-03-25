'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../utils/index.js');
var menu = require('./src/menu.js');
var menuItem$1 = require('./src/menu-item2.js');
var menuItemGroup$1 = require('./src/menu-item-group2.js');
var subMenu = require('./src/sub-menu.js');
var menuItem = require('./src/menu-item.js');
var menuItemGroup = require('./src/menu-item-group.js');
require('./src/types.js');
require('./src/instance.js');
var install = require('../../utils/vue/install.js');

const ElMenu = install.withInstall(menu["default"], {
  MenuItem: menuItem$1["default"],
  MenuItemGroup: menuItemGroup$1["default"],
  SubMenu: subMenu["default"]
});
const ElMenuItem = install.withNoopInstall(menuItem$1["default"]);
const ElMenuItemGroup = install.withNoopInstall(menuItemGroup$1["default"]);
const ElSubMenu = install.withNoopInstall(subMenu["default"]);

exports.menuEmits = menu.menuEmits;
exports.menuProps = menu.menuProps;
exports.subMenuProps = subMenu.subMenuProps;
exports.menuItemEmits = menuItem.menuItemEmits;
exports.menuItemProps = menuItem.menuItemProps;
exports.menuItemGroupProps = menuItemGroup.menuItemGroupProps;
exports.ElMenu = ElMenu;
exports.ElMenuItem = ElMenuItem;
exports.ElMenuItemGroup = ElMenuItemGroup;
exports.ElSubMenu = ElSubMenu;
exports["default"] = ElMenu;
//# sourceMappingURL=index.js.map
