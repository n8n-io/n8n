'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

require('../../utils/index.js');
var tabs = require('./src/tabs.js');
var tabPane$1 = require('./src/tab-pane2.js');
var tabBar = require('./src/tab-bar.js');
var tabNav = require('./src/tab-nav.js');
var tabPane = require('./src/tab-pane.js');
var constants = require('./src/constants.js');
var install = require('../../utils/vue/install.js');

const ElTabs = install.withInstall(tabs["default"], {
  TabPane: tabPane$1["default"]
});
const ElTabPane = install.withNoopInstall(tabPane$1["default"]);

exports.tabsEmits = tabs.tabsEmits;
exports.tabsProps = tabs.tabsProps;
exports.tabBarProps = tabBar.tabBarProps;
exports.tabNavEmits = tabNav.tabNavEmits;
exports.tabNavProps = tabNav.tabNavProps;
exports.tabPaneProps = tabPane.tabPaneProps;
exports.tabsRootContextKey = constants.tabsRootContextKey;
exports.ElTabPane = ElTabPane;
exports.ElTabs = ElTabs;
exports["default"] = ElTabs;
//# sourceMappingURL=index.js.map
