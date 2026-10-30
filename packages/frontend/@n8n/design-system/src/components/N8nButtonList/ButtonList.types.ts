export type ButtonListOrientation = 'horizontal' | 'vertical';

export type ButtonListVariant = 'default' | 'toolbar';

export type ButtonListProps = {
	/**
	 * Layout orientation.
	 * @defaultValue 'horizontal'
	 */
	orientation?: ButtonListOrientation;
	/**
	 * Visual style. `toolbar` groups the buttons in a single surface container.
	 * Use `ghost` buttons inside it.
	 * @defaultValue 'default'
	 */
	variant?: ButtonListVariant;
};
