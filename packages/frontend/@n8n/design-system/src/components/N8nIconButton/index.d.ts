import { N8nComponent, N8nComponentSize } from '../component';
import { ButtonTheme, ButtonType } from '../N8nButton';

/** Icon Button Component */
export declare class N8nIconButton extends N8nComponent {
	/** Button type */
	type: ButtonType;

	/** Button title on hover */
	title: string;

	/** Button size */
	size: N8nComponentSize | 'xlarge';

	/** Determine whether it's loading */
	loading: boolean;

	/** Disable the button */
	disabled: boolean;

	/** Button icon, accepts an icon name of font awesome icon component */
	icon: string;

	/** Button theme */
	theme: ButtonTheme;
}
