'use strict';

var Clipboard = require('../utils/dataTransfer/Clipboard.js');
var copySelection = require('../document/copySelection.js');

async function cut() {
    const doc = this.config.document;
    var _doc_activeElement;
    const target = (_doc_activeElement = doc.activeElement) !== null && _doc_activeElement !== undefined ? _doc_activeElement : /* istanbul ignore next */ doc.body;
    const clipboardData = copySelection.copySelection(target);
    if (clipboardData.items.length === 0) {
        return;
    }
    if (this.dispatchUIEvent(target, 'cut', {
        clipboardData
    }) && this.config.writeToClipboard) {
        await Clipboard.writeDataTransferToClipboard(target.ownerDocument, clipboardData);
    }
    return clipboardData;
}

exports.cut = cut;
