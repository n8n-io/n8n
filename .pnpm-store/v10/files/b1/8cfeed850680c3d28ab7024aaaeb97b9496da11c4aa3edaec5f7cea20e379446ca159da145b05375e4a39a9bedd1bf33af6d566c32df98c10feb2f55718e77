import { writeDataTransferToClipboard } from '../utils/dataTransfer/Clipboard.js';
import { copySelection } from '../document/copySelection.js';

async function copy() {
    const doc = this.config.document;
    var _doc_activeElement;
    const target = (_doc_activeElement = doc.activeElement) !== null && _doc_activeElement !== undefined ? _doc_activeElement : /* istanbul ignore next */ doc.body;
    const clipboardData = copySelection(target);
    if (clipboardData.items.length === 0) {
        return;
    }
    if (this.dispatchUIEvent(target, 'copy', {
        clipboardData
    }) && this.config.writeToClipboard) {
        await writeDataTransferToClipboard(doc, clipboardData);
    }
    return clipboardData;
}

export { copy };
