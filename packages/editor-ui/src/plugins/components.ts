// @ts-nocheck

import Vue from 'vue';
import Fragment from 'vue-fragment';

import 'regenerator-runtime/runtime';

import VueAgile from 'vue-agile';

import ElementUI from 'element-ui';
import { Loading, MessageBox, Message, Notification } from 'element-ui';
import { designSystemComponents } from 'n8n-design-system';
import { ElMessageBoxOptions } from 'element-ui/types/message-box';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';

Vue.use(Fragment.Plugin);

Vue.use(ElementUI);
Vue.use(designSystemComponents);

Vue.component('enterprise-edition', EnterpriseEdition);

Vue.use(VueAgile);
Vue.use(Loading.directive);

Vue.prototype.$loading = Loading.service;
Vue.prototype.$msgbox = MessageBox;

Vue.prototype.$alert = async (
	message: string,
	configOrTitle: string | ElMessageBoxOptions | undefined,
	config: ElMessageBoxOptions | undefined,
) => {
	let temp = config || (typeof configOrTitle === 'object' ? configOrTitle : {});
	temp = {
		...temp,
		cancelButtonClass: 'btn--cancel',
		confirmButtonClass: 'btn--confirm',
	};

	if (typeof configOrTitle === 'string') {
		return await MessageBox.alert(message, configOrTitle, temp);
	}
	return await MessageBox.alert(message, temp);
};

Vue.prototype.$confirm = async (
	message: string,
	configOrTitle: string | ElMessageBoxOptions | undefined,
	config: ElMessageBoxOptions | undefined,
) => {
	let temp = config || (typeof configOrTitle === 'object' ? configOrTitle : {});
	temp = {
		...temp,
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

Vue.prototype.$prompt = async (
	message: string,
	configOrTitle: string | ElMessageBoxOptions | undefined,
	config: ElMessageBoxOptions | undefined,
) => {
	let temp = config || (typeof configOrTitle === 'object' ? configOrTitle : {});
	temp = {
		...temp,
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
