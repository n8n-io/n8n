import { t } from '../locale';

export function useI18n() {
	return {
		t: (path: string, options: string[] = []) => t(path, options),
	};
}
