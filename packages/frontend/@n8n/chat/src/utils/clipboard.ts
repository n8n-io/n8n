// https://github.com/feross/clipboard-copy/blob/master/index.js
export const clipboard = async (text: string): Promise<void> => {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return;
		} catch (err) {
			console.error(err ?? new DOMException('The request is not allowed', 'NotAllowedError'));
		}
	}
	const span = document.createElement('span');
	span.textContent = text;
	span.style.whiteSpace = 'pre';
	document.body.appendChild(span);
	const selection = window.getSelection();
	const range = window.document.createRange();
	selection?.removeAllRanges();
	range.selectNode(span);
	selection?.addRange(range);
	try {
		window.document.execCommand('copy');
	} catch (err) {
		console.error(`execCommand Error: ${err}`);
	}
	selection?.removeAllRanges();
	window.document.body.removeChild(span);
};
