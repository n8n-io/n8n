export default function compressFont(node) {
    const list = node.children;

    list.forEachRight(function(node, item) {
        if (node.type === 'Identifier') {
            if (node.name === 'bold') {
                item.data = {
                    type: 'Number',
                    loc: node.loc,
                    value: '700'
                };
            } else if (node.name === 'normal') {
                const prev = item.prev;

                if (prev && prev.data.type === 'Operator' && prev.data.value === '/') {
                    this.remove(prev);
                }

                this.remove(item);
            }
        }
    });

    if (list.isEmpty) {
        list.insert(list.createItem({
            type: 'Identifier',
            name: 'normal'
        }));
    }
};
