import type { IconSize } from '../../types';
import { N8nComponent } from '../component';

/** Spinner Component */
export declare class N8nSpinner extends N8nComponent {
	/** Icon size. Brand uses this height with a 336:160 aspect ratio. */
	size: IconSize;
	/**
	 * Use brand while a page or component loads, before its content is ready.
	 * Use grid or dots for activity status, such as an assistant thinking or an execution running.
	 */
	type: 'dots' | 'grid' | 'brand';
}
