import { t } from '../locale';

export default {
	methods: {
		t(path: string, options: object) {
			return t.call(this, path, options);
		},
	},
};
