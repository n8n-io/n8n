import { t } from '../locale';

export default {
	methods: {
		t(path: string, options: string[]) {
			return t.call(this, path, options);
		},
	},
};
