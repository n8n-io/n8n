export interface Keymap {
	[key: string]: Array<number | string>;
}

export const keymap: Keymap = {
	tab: ['Tab', 9],
	enter: ['Enter', 13],
	esc: ['Escape', 27],
	space: [' ', 'Space', 32],
	left: ['ArrowLeft', 'Left', 37],
	up: ['ArrowUp', 'Up', 38],
	right: ['ArrowRight', 'Right', 39],
	down: ['ArrowDown', 'Down', 40],
};
