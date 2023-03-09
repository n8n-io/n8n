import { t } from '../locale';

export function useI18n() {
	return {
		t: (path: string, options: string[] = []) => t.apply(path, options),
	};
}
