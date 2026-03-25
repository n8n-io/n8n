'use strict';

const media = {
    parse: {
        prelude() {
            return this.createSingleNodeList(
                this.MediaQueryList()
            );
        },
        block(isStyleBlock = false) {
            return this.Block(isStyleBlock);
        }
    }
};

module.exports = media;
