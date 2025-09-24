import { t } from '../locale';
import type { N8nLocaleTranslateFnOptions } from '../types';

export function useI18n() {
	return {
		t: (path: string, options?: N8nLocaleTranslateFnOptions) => t(path, options),
	};
}
