import { isDisabled } from '../misc/isDisabled.js';

function getActiveElement(document) {
    const activeElement = document.activeElement;
    if (activeElement === null || activeElement === undefined ? undefined : activeElement.shadowRoot) {
        return getActiveElement(activeElement.shadowRoot);
    } else {
        // Browser does not yield disabled elements as document.activeElement - jsdom does
        if (isDisabled(activeElement)) {
            return document.ownerDocument ? /* istanbul ignore next */ document.ownerDocument.body : document.body;
        }
        return activeElement;
    }
}
function getActiveElementOrBody(document) {
    var _getActiveElement;
    return (_getActiveElement = getActiveElement(document)) !== null && _getActiveElement !== undefined ? _getActiveElement : /* istanbul ignore next */ document.body;
}

export { getActiveElement, getActiveElementOrBody };
