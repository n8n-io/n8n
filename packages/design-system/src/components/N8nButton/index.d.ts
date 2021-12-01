import { N8nComponent, N8nComponentSize } from '../component';

/** Button type */
export type ButtonType = 'primary' | 'outline' | 'light' | 'text';

/** Button themes */
export type ButtonTheme = 'success' | 'warning' | 'danger';

/** Button Component */
export declare class N8nButton extends N8nComponent {
	/** Button text */
	label: string;

	/** Button title on hover */
	title: string;

	/** Color scheme */
	theme: ButtonTheme;

	/** Button size */
	size: N8nComponentSize;

	/** Button type */
	type: ButtonType;

	/** Determine whether it's a circular button */
	circle: boolean;

	/** Determine whether it's loading */
	loading: boolean;

	/** Disable the button */
	disabled: boolean;

	/** Button icon, accepts an icon name of font awesome icon component */
	icon: string;

	/** Full width */
	fullWidth: boolean;

	/** Float left or right */
	float: boolean;
}
