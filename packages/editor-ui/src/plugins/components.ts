// @ts-nocheck

import Vue from "vue";
import Fragment from 'vue-fragment';

import "regenerator-runtime/runtime";

import VueAgile from 'vue-agile';

import {
	// element ui components
	Dialog,
	Drawer,
	Dropdown,
	DropdownMenu,
	DropdownItem,
	Submenu,
	Radio,
	RadioGroup,
	RadioButton,
	Checkbox,
	Switch,
	Select,
	Option,
	OptionGroup,
	ButtonGroup,
	Table,
	TableColumn,
	DatePicker,
	Tabs,
	TabPane,
	Tag,
	Row,
	Col,
	Badge,
	Card,
	ColorPicker,
	Container,
	Loading,
	MessageBox,
	Message,
	Notification,
	CollapseTransition,

	N8nActionBox,
	N8nAvatar,
	N8nActionToggle,
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInfoTip,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nLink,
	N8nLoading,
	N8nHeading,
	N8nMarkdown,
	N8nMenu,
	N8nMenuItem,
	N8nOption,
	N8nSelect,
	N8nSpinner,
	N8nFormInputs,
	N8nFormBox,
	N8nSquareButton,
	N8nTags,
	N8nTag,
	N8nText,
	N8nTooltip,
} from 'n8n-design-system';
import { ElMessageBoxOptions } from "element-ui/types/message-box";

Vue.use(Fragment.Plugin);

// n8n design system
Vue.use(N8nActionBox);
Vue.use(N8nActionToggle);
Vue.use(N8nAvatar);
Vue.use(N8nButton);
Vue.component('n8n-form-box', N8nFormBox);
Vue.component('n8n-form-inputs', N8nFormInputs);
Vue.use('n8n-icon', N8nIcon);
Vue.use(N8nIconButton);
Vue.use(N8nInfoTip);
Vue.use(N8nInput);
Vue.use(N8nInputLabel);
Vue.use(N8nInputNumber);
Vue.component('n8n-loading', N8nLoading);
Vue.use(N8nHeading);
Vue.use(N8nLink);
Vue.component('n8n-markdown', N8nMarkdown);
Vue.use(N8nMenu);
Vue.use(N8nMenuItem);
Vue.use(N8nOption);
Vue.use(N8nSelect);
Vue.use(N8nSpinner);
Vue.component('n8n-square-button', N8nSquareButton);
Vue.use(N8nTags);
Vue.use(N8nTag);
Vue.component('n8n-text', N8nText);
Vue.use(N8nTooltip);

// element io
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
