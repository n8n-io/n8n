import type { IconSize } from '../../types';
import { N8nComponent } from '../component';

/** Spinner Component */
export declare class N8nSpinner extends N8nComponent {
	/** Icon size. Brand uses this height with a 336:160 aspect ratio. */
	size: IconSize;
	/** Loading indicator shape */
	type: 'dots' | 'ring' | 'grid' | 'brand';
}
