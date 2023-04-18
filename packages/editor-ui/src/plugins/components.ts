// @ts-nocheck

import Vue from 'vue';
import Fragment from 'vue-fragment';
import VueAgile from 'vue-agile';

import 'regenerator-runtime/runtime';

import ElementUI from 'element-ui';
import { Loading, MessageBox, Notification } from 'element-ui';
import { designSystemComponents } from 'n8n-design-system';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import { useMessage } from '@/composables/useMessage';

Vue.use(Fragment.Plugin);
Vue.use(VueAgile);

Vue.use(ElementUI);
Vue.use(designSystemComponents);

Vue.component('enterprise-edition', EnterpriseEdition);

Vue.use(Loading.directive);

Vue.prototype.$loading = Loading.service;
Vue.prototype.$msgbox = MessageBox;

const messageService = useMessage();

Vue.prototype.$alert = messageService.alert;
Vue.prototype.$confirm = messageService.confirm;
Vue.prototype.$prompt = messageService.prompt;
Vue.prototype.$message = messageService.message;

Vue.prototype.$notify = Notification;
