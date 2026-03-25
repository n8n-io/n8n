import { List } from 'css-tree';

export default function compressBackground(node) {
    function flush() {
        if (!buffer.length) {
            buffer.unshift(
                {
                    type: 'Number',
                    loc: null,
                    value: '0'
                },
                {
                    type: 'Number',
                    loc: null,
                    value: '0'
                }
            );
        }

        newValue.push.apply(newValue, buffer);

        buffer = [];
    }

    let newValue = [];
    let buffer = [];

    node.children.forEach((node) => {
        if (node.type === 'Operator' && node.value === ',') {
            flush();
            newValue.push(node);
            return;
        }

        // remove defaults
        if (node.type === 'Identifier') {
            if (node.name === 'transparent' ||
                node.name === 'none' ||
                node.name === 'repeat' ||
                node.name === 'scroll') {
                return;
            }
        }

        buffer.push(node);
    });

    flush();
    node.children = new List().fromArray(newValue);
};
