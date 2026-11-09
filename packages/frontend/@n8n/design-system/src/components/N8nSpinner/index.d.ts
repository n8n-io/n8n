import type { IconSize } from '../../types';
import { N8nComponent } from '../component';

/** Spinner Component */
export declare class N8nSpinner extends N8nComponent {
	/** Icon size */
	size: IconSize;
	/** Loading indicator shape */
	type: 'dots' | 'ring' | 'grid';
}
