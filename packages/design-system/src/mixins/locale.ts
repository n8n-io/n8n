import { t } from '../locale';

export default {
	methods: {
		t(...args: string[]) {
			return t.apply(this, args);
		},
	},
};
