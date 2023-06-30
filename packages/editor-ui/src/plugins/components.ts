import type { PluginObject } from 'vue';
import VueAgile from 'vue-agile';

import 'regenerator-runtime/runtime';

import ElementUI from 'element-ui';
import { Loading, MessageBox, Notification } from 'element-ui';
import { N8nPlugin } from 'n8n-design-system';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import { useMessage } from '@/composables/useMessage';

export const GlobalComponentsPlugin: PluginObject<{}> = {
	install(app) {
		const messageService = useMessage();

		app.component('enterprise-edition', EnterpriseEdition);

		app.use(VueAgile);
		app.use(ElementUI);
		app.use(N8nPlugin);
		app.use(Loading.directive);

		app.prototype.$loading = Loading.service;
		app.prototype.$msgbox = MessageBox;
		app.prototype.$alert = messageService.alert;
		app.prototype.$confirm = messageService.confirm;
		app.prototype.$prompt = messageService.prompt;
		app.prototype.$message = messageService.message;
		app.prototype.$notify = Notification;
	},
};
