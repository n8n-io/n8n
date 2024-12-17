import { CanvasKey } from '@/constants';
import { injectStrict } from '@/utils/injectStrict';

export function useCanvas() {
	return injectStrict(CanvasKey);
}
