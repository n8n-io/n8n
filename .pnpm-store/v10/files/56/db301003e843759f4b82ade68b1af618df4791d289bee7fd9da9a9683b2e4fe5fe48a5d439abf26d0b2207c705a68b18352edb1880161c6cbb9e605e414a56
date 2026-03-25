import '../../utils/index.mjs';
import Popover from './src/popover2.mjs';
import PopoverDirective, { VPopover } from './src/directive.mjs';
export { popoverEmits, popoverProps } from './src/popover.mjs';
import { withInstallDirective, withInstall } from '../../utils/vue/install.mjs';

const ElPopoverDirective = withInstallDirective(PopoverDirective, VPopover);
const ElPopover = withInstall(Popover, {
  directive: ElPopoverDirective
});

export { ElPopover, ElPopoverDirective, ElPopover as default };
//# sourceMappingURL=index.mjs.map
