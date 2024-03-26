import { t } from '../locale';

export default {
	methods: {
		t(path: string, ...args: string[]) {
			return t.call(this, path, ...args);
		},
	},
};
