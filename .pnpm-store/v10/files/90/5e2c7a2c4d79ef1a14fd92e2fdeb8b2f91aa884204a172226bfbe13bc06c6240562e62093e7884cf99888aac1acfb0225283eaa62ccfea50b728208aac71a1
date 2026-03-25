'use strict';

const Transform = require('stream').Transform;
const MimeNode = require('./mime-node');

const MAX_HEAD_SIZE = 1 * 1024 * 1024;
const MAX_CHILD_NODES = 1000;

const HEAD = 0x01;
const BODY = 0x02;

class MessageSplitter extends Transform {
    constructor(config) {
        let options = {
            readableObjectMode: true,
            writableObjectMode: false
        };
        super(options);

        this.config = config || {};
        this.maxHeadSize = this.config.maxHeadSize || MAX_HEAD_SIZE;
        this.maxChildNodes = this.config.maxChildNodes || MAX_CHILD_NODES;
        this.tree = [];
        this.nodeCounter = 0;
        this.newNode();
        this.tree.push(this.node);
        this.line = false;
        this.hasFailed = false;
    }

    _transform(chunk, encoding, callback) {
        // process line by line
        // find next line ending
        let pos = 0;
        let i = 0;
        let group = {
            type: 'none'
        };
        let groupstart = this.line ? -this.line.length : 0;
        let groupend = 0;

        let checkTrailingLinebreak = data => {
            if (data.type === 'body' && data.node.parentNode && data.value && data.value.length) {
                if (data.value[data.value.length - 1] === 0x0a) {
                    groupstart--;
                    groupend--;
                    pos--;
                    if (data.value.length > 1 && data.value[data.value.length - 2] === 0x0d) {
                        groupstart--;
                        groupend--;
                        pos--;
                        if (groupstart < 0 && !this.line) {
                            // store only <CR> as <LF> should be on the positive side
                            this.line = Buffer.allocUnsafe(1);
                            this.line[0] = 0x0d;
                        }
                        data.value = data.value.slice(0, data.value.length - 2);
                    } else {
                        data.value = data.value.slice(0, data.value.length - 1);
                    }
                } else if (data.value[data.value.length - 1] === 0x0d) {
                    groupstart--;
                    groupend--;
                    pos--;
                    data.value = data.value.slice(0, data.value.length - 1);
                }
            }
        };

        let iterateData = () => {
            for (let len = chunk.length; i < len; i++) {
                // find next <LF>
                if (chunk[i] === 0x0a) {
                    // line end

                    let start = Math.max(pos, 0);
                    pos = ++i;

                    return this.processLine(chunk.slice(start, i), false, (err, data, flush) => {
                        if (err) {
                            this.hasFailed = true;
                            return setImmediate(() => callback(err));
                        }

                        if (!data) {
                            return setImmediate(iterateData);
                        }

                        if (flush) {
                            if (group && group.type !== 'none') {
                                if (group.type === 'body' && groupend >= groupstart && group.node.parentNode) {
                                    // do not include the last line ending for body
                                    if (chunk[groupend - 1] === 0x0a) {
                                        groupend--;
                                        if (groupend >= groupstart && chunk[groupend - 1] === 0x0d) {
                                            groupend--;
                                        }
                                    }
                                }
                                if (groupstart !== groupend) {
                                    group.value = chunk.slice(groupstart, groupend);
                                    if (groupend < i) {
                                        data.value = chunk.slice(groupend, i);
                                    }
                                }
                                this.push(group);
                                group = {
                                    type: 'none'
                                };
                                groupstart = groupend = i;
                            }
                            this.push(data);
                            groupend = i;
                            return setImmediate(iterateData);
                        }

                        if (data.type === group.type) {
                            // shift slice end position forward
                            groupend = i;
                        } else {
                            if (group.type === 'body' && groupend >= groupstart && group.node.parentNode) {
                                // do not include the last line ending for body
                                if (chunk[groupend - 1] === 0x0a) {
                                    groupend--;
                                    if (groupend >= groupstart && chunk[groupend - 1] === 0x0d) {
                                        groupend--;
                                    }
                                }
                            }

                            if (group.type !== 'none' && group.type !== 'node') {
                                // we have a previous data/body chunk to output
                                if (groupstart !== groupend) {
                                    group.value = chunk.slice(groupstart, groupend);
                                    if (group.value && group.value.length) {
                                        this.push(group);
                                        group = {
                                            type: 'none'
                                        };
                                    }
                                }
                            }

                            if (data.type === 'node') {
                                this.push(data);
                                groupstart = i;
                                groupend = i;
                            } else if (groupstart < 0) {
                                groupstart = i;
                                groupend = i;
                                checkTrailingLinebreak(data);
                                if (data.value && data.value.length) {
                                    this.push(data);
                                }
                            } else {
                                // start new body/data chunk
                                group = data;
                                groupstart = groupend;
                                groupend = i;
                            }
                        }
                        return setImmediate(iterateData);
                    });
                }
            }

            // skip last linebreak for body
            if (pos >= groupstart + 1 && group.type === 'body' && group.node.parentNode) {
                // do not include the last line ending for body
                if (chunk[pos - 1] === 0x0a) {
                    pos--;
                    if (pos >= groupstart && chunk[pos - 1] === 0x0d) {
                        pos--;
                    }
                }
            }

            if (group.type !== 'none' && group.type !== 'node' && pos > groupstart) {
                // we have a leftover data/body chunk to push out
                group.value = chunk.slice(groupstart, pos);

                if (group.value && group.value.length) {
                    this.push(group);
                    group = {
                        type: 'none'
                    };
                }
            }

            if (pos < chunk.length) {
                if (this.line) {
                    this.line = Buffer.concat([this.line, chunk.slice(pos)]);
                } else {
                    this.line = chunk.slice(pos);
                }
            }
            callback();
        };

        setImmediate(iterateData);
    }

    _flush(callback) {
        if (this.hasFailed) {
            return callback();
        }
        this.processLine(false, true, (err, data) => {
            if (err) {
                return setImmediate(() => callback(err));
            }
            if (data && (data.type === 'node' || (data.value && data.value.length))) {
                this.push(data);
            }
            callback();
        });
    }

    compareBoundary(line, startpos, boundary) {
        // --{boundary}\r\n or --{boundary}--\r\n
        if (line.length < boundary.length + 3 + startpos || line.length > boundary.length + 6 + startpos) {
            return false;
        }
        for (let i = 0; i < boundary.length; i++) {
            if (line[i + 2 + startpos] !== boundary[i]) {
                return false;
            }
        }

        let pos = 0;
        for (let i = boundary.length + 2 + startpos; i < line.length; i++) {
            let c = line[i];
            if (pos === 0 && (c === 0x0d || c === 0x0a)) {
                // 1: next node
                return 1;
            }
            if (pos === 0 && c !== 0x2d) {
                // expecting "-"
                return false;
            }
            if (pos === 1 && c !== 0x2d) {
                // expecting "-"
                return false;
            }
            if (pos === 2 && c !== 0x0d && c !== 0x0a) {
                // expecting line terminator, either <CR> or <LF>
                return false;
            }
            if (pos === 3 && c !== 0x0a) {
                // expecting line terminator <LF>
                return false;
            }
            pos++;
        }

        // 2: multipart end
        return 2;
    }

    checkBoundary(line) {
        let startpos = 0;
        if (line.length >= 1 && (line[0] === 0x0d || line[0] === 0x0a)) {
            startpos++;
            if (line.length >= 2 && (line[0] === 0x0d || line[1] === 0x0a)) {
                startpos++;
            }
        }
        if (line.length < 4 || line[startpos] !== 0x2d || line[startpos + 1] !== 0x2d) {
            // defnitely not a boundary
            return false;
        }

        let boundary;
        if (this.node._boundary && (boundary = this.compareBoundary(line, startpos, this.node._boundary))) {
            // 1: next child
            // 2: multipart end
            return boundary;
        }

        if (this.node._parentBoundary && (boundary = this.compareBoundary(line, startpos, this.node._parentBoundary))) {
            // 3: next sibling
            // 4: parent end
            return boundary + 2;
        }

        return false;
    }

    processLine(line, final, next) {
        let flush = false;

        if (this.line && line) {
            line = Buffer.concat([this.line, line]);
            this.line = false;
        } else if (this.line && !line) {
            line = this.line;
            this.line = false;
        }

        if (!line) {
            line = Buffer.alloc(0);
        }

        if (this.nodeCounter > this.maxChildNodes) {
            let err = new Error('Max allowed child nodes exceeded');
            err.code = 'EMAXLEN';
            return next(err);
        }

        // we check boundary outside the HEAD/BODY scope as it may appear anywhere
        let boundary = this.checkBoundary(line);
        if (boundary) {
            // reached boundary, switch context
            switch (boundary) {
                case 1:
                    // next child
                    this.newNode(this.node);
                    flush = true;
                    break;
                case 2:
                    // reached end of children, keep current node
                    break;
                case 3: {
                    // next sibling
                    let parentNode = this.node.parentNode;
                    if (parentNode && parentNode.contentType === 'message/rfc822') {
                        // special case where immediate parent is an inline message block
                        // move up another step
                        parentNode = parentNode.parentNode;
                    }
                    this.newNode(parentNode);
                    flush = true;
                    break;
                }
                case 4:
                    // special case when boundary close a node with only header.
                    if (this.node && this.node._headerlen && !this.node.headers) {
                        this.node.parseHeaders();
                        this.push(this.node);
                    }
                    // move up
                    if (this.tree.length) {
                        this.node = this.tree.pop();
                    }
                    this.state = BODY;
                    break;
            }

            return next(
                null,
                {
                    node: this.node,
                    type: 'data',
                    value: line
                },
                flush
            );
        }

        switch (this.state) {
            case HEAD: {
                this.node.addHeaderChunk(line);
                if (this.node._headerlen > this.maxHeadSize) {
                    let err = new Error('Max header size for a MIME node exceeded');
                    err.code = 'EMAXLEN';
                    return next(err);
                }
                if (final || (line.length === 1 && line[0] === 0x0a) || (line.length === 2 && line[0] === 0x0d && line[1] === 0x0a)) {
                    let currentNode = this.node;

                    currentNode.parseHeaders();

                    // if the content is attached message then just continue
                    if (
                        currentNode.contentType === 'message/rfc822' &&
                        !this.config.ignoreEmbedded &&
                        (!currentNode.encoding || ['7bit', '8bit', 'binary'].includes(currentNode.encoding)) &&
                        (this.config.defaultInlineEmbedded ? currentNode.disposition !== 'attachment' : currentNode.disposition === 'inline')
                    ) {
                        currentNode.messageNode = true;
                        this.newNode(currentNode);
                        if (currentNode.parentNode) {
                            this.node._parentBoundary = currentNode.parentNode._boundary;
                        }
                    } else {
                        if (currentNode.contentType === 'message/rfc822') {
                            currentNode.messageNode = false;
                        }
                        this.state = BODY;
                        if (currentNode.multipart && currentNode._boundary) {
                            this.tree.push(currentNode);
                        }
                    }

                    return next(null, currentNode, flush);
                }

                return next();
            }
            case BODY: {
                return next(
                    null,
                    {
                        node: this.node,
                        type: this.node.multipart ? 'data' : 'body',
                        value: line
                    },
                    flush
                );
            }
        }

        next(null, false);
    }

    newNode(parent) {
        this.node = new MimeNode(parent || false, this.config);
        this.state = HEAD;
        this.nodeCounter++;
    }
}

module.exports = MessageSplitter;
