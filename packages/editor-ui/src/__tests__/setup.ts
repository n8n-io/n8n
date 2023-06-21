import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';
import '../plugins';
import { I18nPlugin } from '@/plugins/i18n';
import { config } from '@vue/test-utils';
import { GlobalComponentsPlugin } from '@/plugins/components';
import { GlobalDirectivesPlugin } from '@/plugins/directives';
import { FontAwesomePlugin } from '@/plugins/icons';

configure({ testIdAttribute: 'data-test-id' });

// Vue.config.productionTip = false;
// Vue.config.devtools = false;

config.plugins.VueWrapper.install(I18nPlugin);
config.plugins.VueWrapper.install(FontAwesomePlugin);
config.plugins.VueWrapper.install(GlobalComponentsPlugin);
config.plugins.VueWrapper.install(GlobalDirectivesPlugin);

// TODO: Investigate why this is needed
// Without having this 3rd party library imported like this, any component test using 'vue-json-pretty' fail with:
// [Vue warn]: Failed to mount component: template or render function not defined.
config.stubs['vue-json-pretty'] = require('vue-json-pretty').default;

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));
