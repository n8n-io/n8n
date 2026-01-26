import { CanvasKey } from '@/app/constants';
import { injectStrict } from '@/app/utils/injectStrict';

export function useCanvas() {
	return injectStrict(CanvasKey);
}
