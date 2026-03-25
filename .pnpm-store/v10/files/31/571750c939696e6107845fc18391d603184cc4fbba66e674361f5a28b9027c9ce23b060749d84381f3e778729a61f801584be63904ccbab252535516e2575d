import '../../utils/index.mjs';
import Tabs from './src/tabs.mjs';
export { tabsEmits, tabsProps } from './src/tabs.mjs';
import TabPane from './src/tab-pane2.mjs';
export { tabBarProps } from './src/tab-bar.mjs';
export { tabNavEmits, tabNavProps } from './src/tab-nav.mjs';
export { tabPaneProps } from './src/tab-pane.mjs';
export { tabsRootContextKey } from './src/constants.mjs';
import { withInstall, withNoopInstall } from '../../utils/vue/install.mjs';

const ElTabs = withInstall(Tabs, {
  TabPane
});
const ElTabPane = withNoopInstall(TabPane);

export { ElTabPane, ElTabs, ElTabs as default };
//# sourceMappingURL=index.mjs.map
