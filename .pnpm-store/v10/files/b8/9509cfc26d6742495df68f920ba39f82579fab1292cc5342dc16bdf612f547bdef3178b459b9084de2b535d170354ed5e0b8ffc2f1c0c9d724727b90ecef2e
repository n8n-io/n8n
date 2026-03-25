export default function compressBorder(node) {
    node.children.forEach((node, item, list) => {
        if (node.type === 'Identifier' && node.name.toLowerCase() === 'none') {
            if (list.head === list.tail) {
                // replace `none` for zero when `none` is a single term
                item.data = {
                    type: 'Number',
                    loc: node.loc,
                    value: '0'
                };
            } else {
                list.remove(item);
            }
        }
    });
};
