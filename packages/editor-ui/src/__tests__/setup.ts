import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';
import { I18nPlugin } from '@/plugins/i18n';
import { config, RouterLinkStub } from '@vue/test-utils';
import { GlobalComponentsPlugin } from '@/plugins/components';
import { GlobalDirectivesPlugin } from '@/plugins/directives';
import { FontAwesomePlugin } from '@/plugins/icons';
import vuwJsonPretty from 'vue-json-pretty';

// Vue.config.productionTip = false;
// Vue.config.devtools = false;
// config.plugins.VueWrapper.
console.log('Global setup?');
config.global.plugins = [
	I18nPlugin,
	FontAwesomePlugin,
	GlobalComponentsPlugin,
	GlobalDirectivesPlugin,
];
config.global.stubs = {
	RouterLink: RouterLinkStub,
	'vue-json-pretty': vuwJsonPretty,
};

// TODO: Investigate why this is needed
// Without having this 3rd party library imported like this, any component test using 'vue-json-pretty' fail with:
// [Vue warn]: Failed to mount component: template or render function not defined.
// config.stubs['vue-json-pretty'] = vuwJsonPrett;

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));
console.log('After global setup');
configure({ testIdAttribute: 'data-test-id' });
