// @ts-nocheck

import Vue from "vue";
import Fragment from 'vue-fragment';

import "regenerator-runtime/runtime";

import Drawer from 'element-ui/lib/drawer';
import Dialog from 'element-ui/lib/dialog';
import Dropdown from 'element-ui/lib/dropdown';
import DropdownMenu from 'element-ui/lib/dropdown-menu';
import DropdownItem from 'element-ui/lib/dropdown-item';
import Submenu from 'element-ui/lib/submenu';
import Radio from 'element-ui/lib/radio';
import RadioGroup from 'element-ui/lib/radio-group';
import RadioButton from 'element-ui/lib/radio-button';
import Checkbox from 'element-ui/lib/checkbox';
import Switch from 'element-ui/lib/switch';
import Select from 'element-ui/lib/select';
import Option from 'element-ui/lib/option';
import OptionGroup from 'element-ui/lib/option-group';
import ButtonGroup from 'element-ui/lib/button-group';
import Table from 'element-ui/lib/table';
import TableColumn from 'element-ui/lib/table-column';
import DatePicker from 'element-ui/lib/date-picker';
import Tabs from 'element-ui/lib/tabs';
import TabPane from 'element-ui/lib/tab-pane';
import Tag from 'element-ui/lib/tag';
import Row from 'element-ui/lib/row';
import Col from 'element-ui/lib/col';
import Badge from 'element-ui/lib/badge';
import Card from 'element-ui/lib/card';
import ColorPicker from 'element-ui/lib/color-picker';
import Container from 'element-ui/lib/container';
import Loading from 'element-ui/lib/loading';
import MessageBox from 'element-ui/lib/message-box';
import Message from 'element-ui/lib/message';
import Notification from 'element-ui/lib/notification';
import CollapseTransition from 'element-ui/lib/transitions/collapse-transition';
import VueAgile from 'vue-agile';

// @ts-ignore
import lang from 'element-ui/lib/locale/lang/en';
// @ts-ignore
import locale from 'element-ui/lib/locale';

import {
	N8nIconButton,
	N8nButton,
	N8nInfoTip,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nLoading,
	N8nHeading,
	N8nMarkdown,
	N8nMenu,
	N8nMenuItem,
	N8nSelect,
	N8nSpinner,
	N8nSquareButton,
	N8nTags,
	N8nTag,
	N8nText,
	N8nTooltip,
	N8nOption,
} from 'n8n-design-system';
import { ElMessageBoxOptions } from "element-ui/types/message-box";

Vue.use(Fragment.Plugin);

// n8n design system
Vue.use(N8nButton);
Vue.use(N8nIconButton);
Vue.use(N8nInfoTip);
Vue.use(N8nInput);
Vue.use(N8nInputLabel);
Vue.use(N8nInputNumber);
Vue.component('n8n-loading', N8nLoading);
Vue.use(N8nHeading);
Vue.component('n8n-markdown', N8nMarkdown);
Vue.use(N8nMenu);
Vue.use(N8nMenuItem);
Vue.use(N8nSelect);
Vue.use(N8nSpinner);
Vue.component('n8n-square-button', N8nSquareButton);
Vue.use(N8nTags);
Vue.use(N8nTag);
Vue.component('n8n-text', N8nText);
Vue.use(N8nTooltip);
Vue.use(N8nOption);

// element io
locale.use(lang);

Vue.use(Dialog);
Vue.use(Drawer);
Vue.use(Dropdown);
Vue.use(DropdownMenu);
Vue.use(DropdownItem);
Vue.use(Submenu);
Vue.use(Radio);
Vue.use(RadioGroup);
Vue.use(RadioButton);
Vue.use(Checkbox);
Vue.use(Switch);
Vue.use(Select);
Vue.use(Option);
Vue.use(OptionGroup);
Vue.use(ButtonGroup);
Vue.use(Table);
Vue.use(TableColumn);
Vue.use(DatePicker);
Vue.use(Tabs);
Vue.use(TabPane);
Vue.use(Tag);
Vue.use(Row);
Vue.use(Col);
Vue.use(Badge);
Vue.use(Card);
Vue.use(ColorPicker);
Vue.use(Container);
Vue.use(VueAgile);

Vue.component(CollapseTransition.name, CollapseTransition);

Vue.use(Loading.directive);

Vue.prototype.$loading = Loading.service;
Vue.prototype.$msgbox = MessageBox;

Vue.prototype.$alert = async (message: string, configOrTitle: string | ElMessageBoxOptions | undefined, config: ElMessageBoxOptions | undefined) => {
	let temp = config || (typeof configOrTitle === 'object' ? configOrTitle : {});
	temp = {
		...temp,
		roundButton: true,
		cancelButtonClass: 'btn--cancel',
		confirmButtonClass: 'btn--confirm',
	};

	if (typeof configOrTitle === 'string') {
		return await MessageBox.alert(message, configOrTitle, temp);
	}
	return await MessageBox.alert(message, temp);
};

Vue.prototype.$confirm = async (message: string, configOrTitle: string | ElMessageBoxOptions | undefined, config: ElMessageBoxOptions | undefined) => {
	let temp = config || (typeof configOrTitle === 'object' ? configOrTitle : {});
	temp = {
		...temp,
		roundButton: true,
		cancelButtonClass: 'btn--cancel',
		confirmButtonClass: 'btn--confirm',
		distinguishCancelAndClose: true,
		showClose: config.showClose || false,
		closeOnClickModal: false,
	};

	if (typeof configOrTitle === 'string') {
		return await MessageBox.confirm(message, configOrTitle, temp);
	}
	return await MessageBox.confirm(message, temp);
};

Vue.prototype.$prompt = async (message: string, configOrTitle: string | ElMessageBoxOptions | undefined, config: ElMessageBoxOptions | undefined) => {
	let temp = config || (typeof configOrTitle === 'object' ? configOrTitle : {});
	temp = {
		...temp,
		roundButton: true,
		cancelButtonClass: 'btn--cancel',
		confirmButtonClass: 'btn--confirm',
	};

	if (typeof configOrTitle === 'string') {
		return await MessageBox.prompt(message, configOrTitle, temp);
	}
	return await MessageBox.prompt(message, temp);
};

Vue.prototype.$notify = Notification;
Vue.prototype.$message = Message;
