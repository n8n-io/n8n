import type { Plugin } from 'vue';

import 'regenerator-runtime/runtime';

import ElementPlus from 'element-plus';
import { ElLoading, ElMessageBox, ElNotification } from 'element-plus';
import { N8nPlugin } from 'n8n-design-system';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import { useMessage } from '@/composables/useMessage';

export const GlobalComponentsPlugin: Plugin<{}> = {
	install(app) {
		const messageService = useMessage();

		app.component('enterprise-edition', EnterpriseEdition);

		app.use(ElementPlus);
		app.use(N8nPlugin);

		app.use(ElLoading);
		app.use(ElNotification);

		app.config.globalProperties.$loading = ElLoading.service;
		app.config.globalProperties.$msgbox = ElMessageBox;
		app.config.globalProperties.$alert = messageService.alert;
		app.config.globalProperties.$confirm = messageService.confirm;
		app.config.globalProperties.$prompt = messageService.prompt;
		app.config.globalProperties.$message = messageService.message;
	},
};
