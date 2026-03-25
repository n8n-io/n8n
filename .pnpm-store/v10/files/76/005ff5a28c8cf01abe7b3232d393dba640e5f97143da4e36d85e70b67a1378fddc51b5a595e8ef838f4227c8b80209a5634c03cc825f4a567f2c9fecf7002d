'use strict';

// Helper class to rewrite nodes with specific mime type

const Transform = require('stream').Transform;
const FlowedDecoder = require('./flowed-decoder');

/**
 * NodeRewriter Transform stream. Updates content for all nodes with specified mime type
 *
 * @constructor
 * @param {String} mimeType Define the Mime-Type to look for
 * @param {Function} streamAction Function to run with the node content
 */
class NodeStreamer extends Transform {
    constructor(filterFunc, streamAction) {
        let options = {
            readableObjectMode: true,
            writableObjectMode: true
        };
        super(options);

        this.filterFunc = filterFunc;
        this.streamAction = streamAction;

        this.decoder = false;
        this.canContinue = false;
        this.continue = false;
    }

    _transform(data, encoding, callback) {
        this.processIncoming(data, callback);
    }

    _flush(callback) {
        if (this.decoder) {
            // emit an empty node just in case there is pending data to end
            return this.processIncoming(
                {
                    type: 'none'
                },
                callback
            );
        }
        return callback();
    }

    processIncoming(data, callback) {
        if (this.decoder && data.type === 'body') {
            // data to parse
            this.push(data);
            if (!this.decoder.write(data.value)) {
                return this.decoder.once('drain', callback);
            } else {
                return callback();
            }
        } else if (this.decoder && data.type !== 'body') {
            // stop decoding.
            // we can not process the current data chunk as we need to wait until
            // the parsed data is completely processed, so we store a reference to the
            // continue callback

            let doContinue = () => {
                this.continue = false;
                this.decoder = false;
                this.canContinue = false;
                this.processIncoming(data, callback);
            };

            if (this.canContinue) {
                setImmediate(doContinue);
            } else {
                this.continue = () => doContinue();
            }

            return this.decoder.end();
        } else if (data.type === 'node' && this.filterFunc(data)) {
            this.push(data);
            // found matching node, create new handler
            this.emit('node', this.createDecoder(data));
        } else if (this.readable && data.type !== 'none') {
            // we don't care about this data, just pass it over to the joiner
            this.push(data);
        }
        callback();
    }

    createDecoder(node) {
        this.decoder = node.getDecoder();

        let decoder = this.decoder;
        decoder.$reading = false;

        if (/^text\//.test(node.contentType) && node.flowed) {
            let flowDecoder = decoder;
            decoder = new FlowedDecoder({
                delSp: node.delSp
            });
            flowDecoder.on('error', err => {
                decoder.emit('error', err);
            });
            flowDecoder.pipe(decoder);
        }

        return {
            node,
            decoder,
            done: () => {
                if (typeof this.continue === 'function') {
                    // called once input stream is processed
                    this.continue();
                } else {
                    // called before input stream is processed
                    this.canContinue = true;
                }
            }
        };
    }
}

module.exports = NodeStreamer;
