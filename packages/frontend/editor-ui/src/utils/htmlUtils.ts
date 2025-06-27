import xss, { escapeAttrValue } from 'xss';
import { ALLOWED_HTML_ATTRIBUTES, ALLOWED_HTML_TAGS } from '@/constants';

/*
	Constants and utility functions that help in HTML, CSS and DOM manipulation
*/
export function sanitizeHtml(dirtyHtml: string) {
	const sanitizedHtml = xss(dirtyHtml, {
		onTagAttr: (tag, name, value) => {
			if (tag === 'img' && name === 'src') {
				// Only allow http requests to supported image files from the `static` directory
				const isImageFile = value.split('#')[0].match(/\.(jpeg|jpg|gif|png|webp)$/) !== null;
				const isStaticImageFile = isImageFile && value.startsWith('/static/');
				if (!value.startsWith('https://') && !isStaticImageFile) {
					return '';
				}
			}

			if (ALLOWED_HTML_ATTRIBUTES.includes(name) || name.startsWith('data-')) {
				// href is allowed but we allow only https and relative URLs
				if (name === 'href' && !value.match(/^https?:\/\//gm) && !value.startsWith('/')) {
					return '';
				}
				return `${name}="${escapeAttrValue(value)}"`;
			}

			return;
			// Return nothing, means keep the default handling measure
		},
		onTag: (tag) => {
			if (!ALLOWED_HTML_TAGS.includes(tag)) return '';
			return;
		},
	});

	return sanitizedHtml;
}

/**
 * Checks if the input is a string and sanitizes it by removing or escaping harmful characters,
 * returning the original input if it's not a string.
 */
export const sanitizeIfString = <T>(message: T): string | T => {
	if (typeof message === 'string') {
		return sanitizeHtml(message);
	}
	return message;
};

export const capitalizeFirstLetter = (text: string): string => {
	return text.charAt(0).toUpperCase() + text.slice(1);
};

export const getBannerRowHeight = async (): Promise<number> => {
	return await new Promise((resolve) => {
		setTimeout(() => {
			resolve(document.getElementById('banners')?.clientHeight ?? 0);
		}, 0);
	});
};

export function isOutsideSelected(el: HTMLElement | null) {
	const selection = document.getSelection();

	if (!selection?.anchorNode || !selection.focusNode || !el) {
		return false;
	}

	return (
		!el.contains(selection.anchorNode) &&
		!el.contains(selection.focusNode) &&
		(selection.anchorNode !== selection.focusNode ||
			selection.anchorOffset !== selection.focusOffset)
	);
}

let scrollbarWidth: number | undefined;

export function getScrollbarWidth() {
	if (scrollbarWidth !== undefined) {
		return scrollbarWidth;
	}

	const outer = document.createElement('div');
	const inner = document.createElement('div');

	outer.style.visibility = 'hidden';
	outer.style.overflow = 'scroll';
	document.body.appendChild(outer);

	outer.appendChild(inner);

	scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

	outer.parentElement?.removeChild(outer);

	return scrollbarWidth;
}
