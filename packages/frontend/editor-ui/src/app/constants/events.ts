/**
 * Mapping for the MouseEvent.button property that indicates which button was pressed
 * on the mouse to trigger the event.
 *
 * @docs https://www.w3.org/TR/uievents/#dom-mouseevent-button
 */
export const MOUSE_EVENT_BUTTON = {
	PRIMARY: 0,
	MIDDLE: 1,
	SECONDARY: 2,
	BROWSER_BACK: 3,
	BROWSER_FORWARD: 4,
} as const;

/**
 * Mapping for the MouseEvent.buttons property that indicates which buttons are pressed
 * on the mouse when a mouse event is triggered. If multiple buttons are pressed,
 * the values are added together to produce a new number.
 *
 * @docs https://www.w3.org/TR/uievents/#dom-mouseevent-buttons
 */
export const MOUSE_EVENT_BUTTONS = {
	NONE: 0,
	PRIMARY: 1,
	SECONDARY: 2,
	MIDDLE: 4,
	BROWSER_BACK: 8,
	BROWSER_FORWARD: 16,
} as const;
