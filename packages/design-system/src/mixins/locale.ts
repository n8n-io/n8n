import { t } from '../locale';

export default {
	methods: {
		t(path: string, ...args: string[]): string {
			return t.call(this, path, ...args);
		},
	},
};
