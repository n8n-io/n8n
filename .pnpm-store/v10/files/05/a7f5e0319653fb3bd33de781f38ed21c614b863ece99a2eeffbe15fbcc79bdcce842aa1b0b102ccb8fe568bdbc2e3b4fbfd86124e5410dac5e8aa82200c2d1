import '../../utils/index.mjs';
import Menu from './src/menu.mjs';
export { menuEmits, menuProps } from './src/menu.mjs';
import MenuItem from './src/menu-item2.mjs';
import MenuItemGroup from './src/menu-item-group2.mjs';
import SubMenu from './src/sub-menu.mjs';
export { subMenuProps } from './src/sub-menu.mjs';
export { menuItemEmits, menuItemProps } from './src/menu-item.mjs';
export { menuItemGroupProps } from './src/menu-item-group.mjs';
import './src/types.mjs';
import './src/instance.mjs';
import { withInstall, withNoopInstall } from '../../utils/vue/install.mjs';

const ElMenu = withInstall(Menu, {
  MenuItem,
  MenuItemGroup,
  SubMenu
});
const ElMenuItem = withNoopInstall(MenuItem);
const ElMenuItemGroup = withNoopInstall(MenuItemGroup);
const ElSubMenu = withNoopInstall(SubMenu);

export { ElMenu, ElMenuItem, ElMenuItemGroup, ElSubMenu, ElMenu as default };
//# sourceMappingURL=index.mjs.map
