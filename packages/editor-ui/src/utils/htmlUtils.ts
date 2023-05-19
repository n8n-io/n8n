import xss, { friendlyAttrValue } from 'xss';
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
				return `${name}="${friendlyAttrValue(value)}"`;
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

export function getStyleTokenValue(name: string): string {
	const style = getComputedStyle(document.body);
	return style.getPropertyValue(name);
}

export function setPageTitle(title: string) {
	window.document.title = title;
}

export function convertRemToPixels(rem: string) {
	return parseInt(rem, 10) * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function isChildOf(parent: Element, child: Element): boolean {
	if (child.parentElement === null) {
		return false;
	}
	if (child.parentElement === parent) {
		return true;
	}

	return isChildOf(parent, child.parentElement);
}

export const capitalizeFirstLetter = (text: string): string => {
	return text.charAt(0).toUpperCase() + text.slice(1);
};
