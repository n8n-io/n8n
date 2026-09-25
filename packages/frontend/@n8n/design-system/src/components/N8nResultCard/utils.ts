/** Card data is untrusted (LLM-authored); only absolute https URLs are ever rendered as links. */
export const isSafeHref = (href?: string): href is string =>
	typeof href === 'string' && href.startsWith('https://');
