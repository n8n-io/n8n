import { property as resolveName } from 'css-tree';
import font from './property/font.js';
import fontWeight from './property/font-weight.js';
import background from './property/background.js';
import border from './property/border.js';
import outline from './property/border.js';

const handlers = {
    'font': font,
    'font-weight': fontWeight,
    'background': background,
    'border': border,
    'outline': outline
};

export default function compressValue(node) {
    if (!this.declaration) {
        return;
    }

    const property = resolveName(this.declaration.property);

    if (handlers.hasOwnProperty(property.basename)) {
        handlers[property.basename](node);
    }
};
