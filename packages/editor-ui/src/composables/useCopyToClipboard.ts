import copyToClipboard from 'copy-to-clipboard';

export function useCopyToClipboard(): (text: string) => void {
	return copyToClipboard;
}
