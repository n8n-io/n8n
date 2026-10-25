import { RuleTester } from '@typescript-eslint/rule-tester';
import type { RuleModule } from '@typescript-eslint/utils/ts-eslint';

import { NoElementPlusMenuRule } from './no-element-plus-menu.js';
import { NoRekaUiCheckboxRule } from './no-reka-ui-checkbox.js';
import { NoRekaUiComboboxRule } from './no-reka-ui-combobox.js';
import { NoRekaUiDateRangePickerRule } from './no-reka-ui-date-range-picker.js';
import { NoRekaUiDialogRule } from './no-reka-ui-dialog.js';
import { NoRekaUiEditableRule } from './no-reka-ui-editable.js';
import { NoRekaUiNumberFieldRule } from './no-reka-ui-number-field.js';
import { NoRekaUiPopoverRule } from './no-reka-ui-popover.js';
import { NoRekaUiRadioGroupRule } from './no-reka-ui-radio-group.js';
import { NoRekaUiScrollAreaRule } from './no-reka-ui-scroll-area.js';
import { NoRekaUiSelectRule } from './no-reka-ui-select.js';
import { NoRekaUiSwitchRule } from './no-reka-ui-switch.js';
import { NoRekaUiTagsInputRule } from './no-reka-ui-tags-input.js';
import { NoRekaUiToggleRule } from './no-reka-ui-toggle.js';
import { NoRekaUiTooltipRule } from './no-reka-ui-tooltip.js';
import { NoRekaUiTreeRule } from './no-reka-ui-tree.js';

const ruleTester = new RuleTester();
const root = '/repo/packages/frontend/@n8n/design-system/src';

const cases = [
	{
		name: 'no-element-plus-menu',
		rule: NoElementPlusMenuRule,
		messageId: 'noElementPlusMenu',
		code: "import { ElMenu, ElSubMenu, ElMenuItem } from 'element-plus';",
		names: ['ElMenu', 'ElSubMenu', 'ElMenuItem'],
		allowed: `${root}/components/N8nNavigationDropdown/NavigationDropdown.vue`,
	},
	{
		name: 'no-reka-ui-checkbox',
		rule: NoRekaUiCheckboxRule,
		messageId: 'noRekaUiCheckbox',
		code: "import { CheckboxRoot } from 'reka-ui';",
		names: ['CheckboxRoot'],
		allowed: `${root}/v2/components/Checkbox/Checkbox.vue`,
	},
	{
		name: 'no-reka-ui-combobox',
		rule: NoRekaUiComboboxRule,
		messageId: 'noRekaUiCombobox',
		code: "import { ComboboxRoot } from 'reka-ui';",
		names: ['ComboboxRoot'],
		allowed: `${root}/v2/components/Combobox/reka-ui.ts`,
	},
	{
		name: 'no-reka-ui-date-range-picker',
		rule: NoRekaUiDateRangePickerRule,
		messageId: 'noRekaUiDateRangePicker',
		code: "import { DateRangePickerRoot } from 'reka-ui';",
		names: ['DateRangePickerRoot'],
		allowed: `${root}/components/DateRangePicker/DateRangePicker.vue`,
	},
	{
		name: 'no-reka-ui-dialog',
		rule: NoRekaUiDialogRule,
		messageId: 'noRekaUiDialog',
		code: "import { DialogRoot, AlertDialogContent } from 'reka-ui';",
		names: ['DialogRoot', 'AlertDialogContent'],
		allowed: `${root}/components/N8nAlertDialog/AlertDialog.vue`,
	},
	{
		name: 'no-reka-ui-editable',
		rule: NoRekaUiEditableRule,
		messageId: 'noRekaUiEditable',
		code: "import { EditableRoot } from 'reka-ui';",
		names: ['EditableRoot'],
		allowed: `${root}/components/N8nInlineTextEdit/InlineTextEdit.vue`,
	},
	{
		name: 'no-reka-ui-number-field',
		rule: NoRekaUiNumberFieldRule,
		messageId: 'noRekaUiNumberField',
		code: "import { NumberFieldRoot } from 'reka-ui';",
		names: ['NumberFieldRoot'],
		allowed: `${root}/components/N8nInputNumber/InputNumber.vue`,
	},
	{
		name: 'no-reka-ui-popover',
		rule: NoRekaUiPopoverRule,
		messageId: 'noRekaUiPopover',
		code: "import type { PopoverRootEmits } from 'reka-ui';",
		names: ['PopoverRootEmits'],
		allowed: `${root}/components/DateRangePicker/index.ts`,
	},
	{
		name: 'no-reka-ui-radio-group',
		rule: NoRekaUiRadioGroupRule,
		messageId: 'noRekaUiRadioGroup',
		code: "import { RadioGroupRoot } from 'reka-ui';",
		names: ['RadioGroupRoot'],
		allowed: `${root}/components/N8nSegmentControl/SegmentControl.vue`,
	},
	{
		name: 'no-reka-ui-scroll-area',
		rule: NoRekaUiScrollAreaRule,
		messageId: 'noRekaUiScrollArea',
		code: "import { ScrollAreaRoot } from 'reka-ui';",
		names: ['ScrollAreaRoot'],
		allowed: `${root}/components/N8nScrollArea/N8nScrollArea.vue`,
	},
	{
		name: 'no-reka-ui-select',
		rule: NoRekaUiSelectRule,
		messageId: 'noRekaUiSelect',
		code: "import { SelectRoot } from 'reka-ui';",
		names: ['SelectRoot'],
		allowed: `${root}/v2/components/Select/Select.vue`,
	},
	{
		name: 'no-reka-ui-switch',
		rule: NoRekaUiSwitchRule,
		messageId: 'noRekaUiSwitch',
		code: "import { SwitchRoot } from 'reka-ui';",
		names: ['SwitchRoot'],
		allowed: `${root}/components/N8nSwitch/Switch.vue`,
	},
	{
		name: 'no-reka-ui-tags-input',
		rule: NoRekaUiTagsInputRule,
		messageId: 'noRekaUiTagsInput',
		code: "import { TagsInputRoot } from 'reka-ui';",
		names: ['TagsInputRoot'],
		allowed: `${root}/v2/components/TagsInput/reka-ui.ts`,
	},
	{
		name: 'no-reka-ui-toggle',
		rule: NoRekaUiToggleRule,
		messageId: 'noRekaUiToggle',
		code: "import { ToggleGroupRoot } from 'reka-ui';",
		names: ['ToggleGroupRoot'],
		allowed: `${root}/components/N8nToggleGroup/ToggleGroup.vue`,
	},
	{
		name: 'no-reka-ui-tooltip',
		rule: NoRekaUiTooltipRule,
		messageId: 'noRekaUiTooltip',
		code: "import { TooltipRoot } from 'reka-ui';",
		names: ['TooltipRoot'],
		allowed: `${root}/components/N8nTooltip/Tooltip.vue`,
	},
	{
		name: 'no-reka-ui-tree',
		rule: NoRekaUiTreeRule,
		messageId: 'noRekaUiTree',
		code: "import { TreeRoot } from 'reka-ui';",
		names: ['TreeRoot'],
		allowed: `${root}/v2/components/Tree/Tree.vue`,
	},
] as const;

for (const testCase of cases) {
	ruleTester.run(testCase.name, testCase.rule as RuleModule<string, []>, {
		valid: [{ code: testCase.code, filename: testCase.allowed }],
		invalid: [
			{
				code: testCase.code,
				errors: testCase.names.map((name) => ({
					messageId: testCase.messageId,
					data: { name },
				})),
			},
		],
	});
}
