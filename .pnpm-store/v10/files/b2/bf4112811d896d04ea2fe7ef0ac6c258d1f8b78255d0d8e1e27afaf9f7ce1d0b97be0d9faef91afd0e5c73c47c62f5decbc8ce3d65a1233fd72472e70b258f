import '../../utils/index.mjs';
import Radio from './src/radio2.mjs';
import RadioButton from './src/radio-button2.mjs';
import RadioGroup from './src/radio-group2.mjs';
export { radioEmits, radioProps, radioPropsBase } from './src/radio.mjs';
export { radioGroupEmits, radioGroupProps } from './src/radio-group.mjs';
export { radioButtonProps } from './src/radio-button.mjs';
export { radioGroupKey } from './src/constants.mjs';
import { withInstall, withNoopInstall } from '../../utils/vue/install.mjs';

const ElRadio = withInstall(Radio, {
  RadioButton,
  RadioGroup
});
const ElRadioGroup = withNoopInstall(RadioGroup);
const ElRadioButton = withNoopInstall(RadioButton);

export { ElRadio, ElRadioButton, ElRadioGroup, ElRadio as default };
//# sourceMappingURL=index.mjs.map
