import '../../utils/index.mjs';
import Checkbox from './src/checkbox2.mjs';
import CheckboxButton from './src/checkbox-button.mjs';
import CheckboxGroup from './src/checkbox-group2.mjs';
export { checkboxGroupEmits, checkboxGroupProps } from './src/checkbox-group.mjs';
export { checkboxEmits, checkboxProps } from './src/checkbox.mjs';
export { checkboxGroupContextKey } from './src/constants.mjs';
import { withInstall, withNoopInstall } from '../../utils/vue/install.mjs';

const ElCheckbox = withInstall(Checkbox, {
  CheckboxButton,
  CheckboxGroup
});
const ElCheckboxButton = withNoopInstall(CheckboxButton);
const ElCheckboxGroup = withNoopInstall(CheckboxGroup);

export { ElCheckbox, ElCheckboxButton, ElCheckboxGroup, ElCheckbox as default };
//# sourceMappingURL=index.mjs.map
