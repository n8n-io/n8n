import { Plugin } from 'vue';
import VueAgile from 'vue-agile';
import 'regenerator-runtime/runtime';

import ElementPlus, {
	ElLoading,
	ElMessage,
	ElMessageBox,
	ElMessageBoxOptions,
	ElNotification,
} from 'element-plus';

// import { designSystemComponents } from 'n8n-design-system-next';
import { N8nDesignSystem, components } from 'n8n-design-system-next';

import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export const ComponentsPlugin: Plugin = {
	install(app) {
		app.use(VueAgile);

		// app.use(designSystemComponents);
		app.use(N8nDesignSystem, { components });

		app.component('enterprise-edition', EnterpriseEdition);

		app.component('font-awesome-icon', FontAwesomeIcon);

		/**
		 * Element Plus
		 */

		app.use(ElementPlus);

		app.use(ElLoading);
		app.config.globalProperties.$loading = ElLoading.service;

		app.config.globalProperties.$msgbox = ElMessageBox;

		app.config.globalProperties.$alert = async (
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
				return await ElMessageBox.alert(message, configOrTitle, temp);
			}
			return await ElMessageBox.alert(message, temp);
		};

		app.config.globalProperties.$confirm = async (
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
				showClose: config?.showClose || false,
				closeOnClickModal: false,
			};

			if (typeof configOrTitle === 'string') {
				return await ElMessageBox.confirm(message, configOrTitle, temp);
			}
			return await ElMessageBox.confirm(message, temp);
		};

		app.config.globalProperties.$prompt = async (
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
				return await ElMessageBox.prompt(message, configOrTitle, temp);
			}
			return await ElMessageBox.prompt(message, temp);
		};

		app.config.globalProperties.$notify = ElNotification;
		app.config.globalProperties.$message = ElMessage;
	},
};
