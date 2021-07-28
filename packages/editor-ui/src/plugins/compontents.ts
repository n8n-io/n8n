import Vue from "vue";
import Fragment from 'vue-fragment';

import "regenerator-runtime/runtime";
import {
	Pagination,
	Autocomplete,
	Drawer,
	Dialog,
	Dropdown,
	DropdownMenu,
	DropdownItem,
	Menu,
	Submenu,
	MenuItem,
	MenuItemGroup,
	Input,
	InputNumber,
	Radio,
	RadioGroup,
	RadioButton,
	Checkbox,
	CheckboxButton,
	CheckboxGroup,
	Switch,
	Select,
	Option,
	OptionGroup,
	Button,
	ButtonGroup,
	Table,
	TableColumn,
	DatePicker,
	TimeSelect,
	TimePicker,
	Popover,
	Tooltip,
	Breadcrumb,
	BreadcrumbItem,
	Form,
	FormItem,
	Tabs,
	TabPane,
	Tag,
	Tree,
	Alert,
	Slider,
	Icon,
	Row,
	Col,
	Upload,
	Progress,
	Badge,
	Card,
	Rate,
	Steps,
	Step,
	Carousel,
	CarouselItem,
	Collapse,
	CollapseItem,
	ColorPicker,
	Transfer,
	Container,
	Header,
	Aside,
	Main,
	Footer,
	Timeline,
	TimelineItem,
	Link,
	Divider,
	Image,
	Calendar,
	Backtop,
	PageHeader,
	Loading,
	MessageBox,
	Message,
	Notification,
} from 'element-ui';
import lang from 'element-ui/lib/locale/lang/en';
import locale from 'element-ui/lib/locale';

import {
	N8nIconButton,
	N8nButton,
} from 'n8n-design-system';

Vue.use(Fragment.Plugin);

// n8n design system
Vue.use(N8nButton);
Vue.use(N8nIconButton);

// element io
locale.use(lang)

Vue.use(Pagination);
Vue.use(Dialog);
Vue.use(Autocomplete);
Vue.use(Drawer);
Vue.use(Dropdown);
Vue.use(DropdownMenu);
Vue.use(DropdownItem);
Vue.use(Menu);
Vue.use(Submenu);
Vue.use(MenuItem);
Vue.use(MenuItemGroup);
Vue.use(Input);
Vue.use(InputNumber);
Vue.use(Radio);
Vue.use(RadioGroup);
Vue.use(RadioButton);
Vue.use(Checkbox);
Vue.use(CheckboxButton);
Vue.use(CheckboxGroup);
Vue.use(Switch);
Vue.use(Select);
Vue.use(Option);
Vue.use(OptionGroup);
Vue.use(Button);
Vue.use(ButtonGroup);
Vue.use(Table);
Vue.use(TableColumn);
Vue.use(DatePicker);
Vue.use(TimeSelect);
Vue.use(TimePicker);
Vue.use(Popover);
Vue.use(Tooltip);
Vue.use(Breadcrumb);
Vue.use(BreadcrumbItem);
Vue.use(Form);
Vue.use(FormItem);
Vue.use(Tabs);
Vue.use(TabPane);
Vue.use(Tag);
Vue.use(Tree);
Vue.use(Alert);
Vue.use(Slider);
Vue.use(Icon);
Vue.use(Row);
Vue.use(Col);
Vue.use(Upload);
Vue.use(Progress);
Vue.use(Badge);
Vue.use(Card);
Vue.use(Rate);
Vue.use(Steps);
Vue.use(Step);
Vue.use(Carousel);
Vue.use(CarouselItem);
Vue.use(Collapse);
Vue.use(CollapseItem);
Vue.use(ColorPicker);
Vue.use(Transfer);
Vue.use(Container);
Vue.use(Header);
Vue.use(Aside);
Vue.use(Main);
Vue.use(Footer);
Vue.use(Timeline);
Vue.use(TimelineItem);
Vue.use(Link);
Vue.use(Divider);
Vue.use(Image);
Vue.use(Calendar);
Vue.use(Backtop);
Vue.use(PageHeader);

Vue.use(Loading.directive);

Vue.prototype.$loading = Loading.service;
Vue.prototype.$msgbox = MessageBox;
Vue.prototype.$alert = MessageBox.alert;
Vue.prototype.$confirm = MessageBox.confirm;
Vue.prototype.$prompt = MessageBox.prompt;
Vue.prototype.$notify = Notification;
Vue.prototype.$message = Message;