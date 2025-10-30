import type { Plugin } from 'vue';

import 'regenerator-runtime/runtime';

import { ElLoading, ElMessageBox } from 'element-plus';
import { N8nPlugin } from '@n8n/design-system';
import { useMessage } from '@/composables/useMessage';

export const GlobalComponentsPlugin: Plugin = {
	install(app) {
		const messageService = useMessage();

		app.use(N8nPlugin, {});

		app.use(ElLoading);

		app.config.globalProperties.$loading = ElLoading.service;
		app.config.globalProperties.$msgbox = ElMessageBox;
		app.config.globalProperties.$alert = messageService.alert;
		app.config.globalProperties.$confirm = messageService.confirm;
		app.config.globalProperties.$prompt = messageService.prompt;
		app.config.globalProperties.$message = messageService.message;
	},
};
