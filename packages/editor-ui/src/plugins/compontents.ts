// @ts-nocheck

import Vue from "vue";
import Fragment from 'vue-fragment';

import "regenerator-runtime/runtime";
// import Pagination 
// import Autocomplete 
import Drawer from 'element-ui/lib/drawer';
import Dialog from 'element-ui/lib/dialog';
import Dropdown from 'element-ui/lib/dropdown';
import DropdownMenu from 'element-ui/lib/dropdown-menu';
import DropdownItem from 'element-ui/lib/dropdown-item';
import Menu from 'element-ui/lib/menu';
import Submenu from 'element-ui/lib/submenu';
import MenuItem from 'element-ui/lib/menu-item';
// import MenuItemGroup from 'element-ui/lib/';
import Input from 'element-ui/lib/input';
import InputNumber from 'element-ui/lib/input-number';
import Radio from 'element-ui/lib/radio';
import RadioGroup from 'element-ui/lib/radio-group';
import RadioButton from 'element-ui/lib/radio-button';
import Checkbox from 'element-ui/lib/checkbox';
// import CheckboxButton from 'element-ui/lib/';
// import CheckboxGroup from 'element-ui/lib/';
import Switch from 'element-ui/lib/switch';
import Select from 'element-ui/lib/select';
import Option from 'element-ui/lib/option';
import OptionGroup from 'element-ui/lib/option-group';
// import Button from 'element-ui/lib/';
import ButtonGroup from 'element-ui/lib/button-group';
import Table from 'element-ui/lib/table';
import TableColumn from 'element-ui/lib/table-column';
import DatePicker from 'element-ui/lib/date-picker';
// import TimeSelect from 'element-ui/lib/';
// import TimePicker from 'element-ui/lib/';
import Popover from 'element-ui/lib/popover';
import Tooltip from 'element-ui/lib/tooltip';
// import Breadcrumb from 'element-ui/lib/';
// import BreadcrumbItem from 'element-ui/lib/';
import Form from 'element-ui/lib/form';
import FormItem from 'element-ui/lib/form-item';
import Tabs from 'element-ui/lib/tabs';
import TabPane from 'element-ui/lib/tab-pane';
import Tag from 'element-ui/lib/tag';
// import Tree from 'element-ui/lib/';
// import Alert from 'element-ui/lib/';
// import Slider from 'element-ui/lib/';
// import Icon from 'element-ui/lib/icon';
import Row from 'element-ui/lib/row';
import Col from 'element-ui/lib/col';
// import Upload from 'element-ui/lib/';
// import Progress from 'element-ui/lib/';
import Badge from 'element-ui/lib/badge';
import Card from 'element-ui/lib/card';
// import Rate from 'element-ui/lib/';
// import Steps from 'element-ui/lib/';
// import Step from 'element-ui/lib/';
// import Carousel from 'element-ui/lib/';
// import CarouselItem from 'element-ui/lib/';
// import Collapse from 'element-ui/lib/';
// import CollapseItem from 'element-ui/lib/';
import ColorPicker from 'element-ui/lib/color-picker';
import Transfer from 'element-ui/lib/transfer';
import Container from 'element-ui/lib/container';
// import Header from 'element-ui/lib/';
// import Aside from 'element-ui/lib/';
// import Main from 'element-ui/lib/';
// import Footer from 'element-ui/lib/';
// import Timeline from 'element-ui/lib/';
// import TimelineItem from 'element-ui/lib/';
// import Link from 'element-ui/lib/';
// import Divider from 'element-ui/lib/';
// import Image from 'element-ui/lib/';
// import Calendar from 'element-ui/lib/';
// import Backtop from 'element-ui/lib/';
// import PageHeader from 'element-ui/lib/';
import Loading from 'element-ui/lib/loading';
import MessageBox from 'element-ui/lib/message-box';
import Message from 'element-ui/lib/message';
import Notification from 'element-ui/lib/notification';
import CollapseTransition from 'element-ui/lib/transitions/collapse-transition';

// @ts-ignore
import lang from 'element-ui/lib/locale/lang/en';
// @ts-ignore
import locale from 'element-ui/lib/locale';

import {
	N8nIconButton,
	N8nButton,
} from 'n8n-design-system';
import { ElMessageBoxOptions } from "element-ui/types/message-box";

Vue.use(Fragment.Plugin);

// n8n design system
Vue.use(N8nButton);
Vue.use(N8nIconButton);

// element io
locale.use(lang);

// Vue.use(Pagination);
Vue.use(Dialog);
// Vue.use(Autocomplete);
Vue.use(Drawer);
Vue.use(Dropdown);
Vue.use(DropdownMenu);
Vue.use(DropdownItem);
Vue.use(Menu);
Vue.use(Submenu);
Vue.use(MenuItem);
// Vue.use(MenuItemGroup);
Vue.use(Input);
Vue.use(InputNumber);
Vue.use(Radio);
Vue.use(RadioGroup);
Vue.use(RadioButton);
Vue.use(Checkbox);
// Vue.use(CheckboxButton);
// Vue.use(CheckboxGroup);
Vue.use(Switch);
Vue.use(Select);
Vue.use(Option);
Vue.use(OptionGroup);
// Vue.use(Button);
Vue.use(ButtonGroup);
Vue.use(Table);
Vue.use(TableColumn);
Vue.use(DatePicker);
// Vue.use(TimeSelect);
// Vue.use(TimePicker);
Vue.use(Popover);
Vue.use(Tooltip);
// Vue.use(Breadcrumb);
// Vue.use(BreadcrumbItem);
Vue.use(Form);
Vue.use(FormItem);
Vue.use(Tabs);
Vue.use(TabPane);
Vue.use(Tag);
// Vue.use(Tree);
// Vue.use(Alert);
// Vue.use(Slider);
// Vue.use(Icon);
Vue.use(Row);
Vue.use(Col);
// Vue.use(Upload);
// Vue.use(Progress);
Vue.use(Badge);
Vue.use(Card);
// Vue.use(Rate);
// Vue.use(Steps);
// Vue.use(Step);
// Vue.use(Carousel);
// Vue.use(CarouselItem);
// Vue.use(Collapse);
// Vue.use(CollapseItem);
Vue.use(ColorPicker);
Vue.use(Transfer);
Vue.use(Container);
// Vue.use(Header);
// Vue.use(Aside);
// Vue.use(Main);
// Vue.use(Footer);
// Vue.use(Timeline);
// Vue.use(TimelineItem);
// Vue.use(Link);
// Vue.use(Divider);
// Vue.use(Image);
// Vue.use(Calendar);
// Vue.use(Backtop);
// Vue.use(PageHeader);

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