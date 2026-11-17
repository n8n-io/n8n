import { vizeConfig } from '@n8n/oxlint-config/vize';

const config = vizeConfig();

export default {
	vue: {
		linter: {
			...config.vue.linter,
			rules: {
				...config.vue.linter.rules,
				// TODO: Enforce this. editor-ui did not enforce it with ESLint.
				'vue/attribute-hyphenation': 'off',
			},
		},
	},
};
