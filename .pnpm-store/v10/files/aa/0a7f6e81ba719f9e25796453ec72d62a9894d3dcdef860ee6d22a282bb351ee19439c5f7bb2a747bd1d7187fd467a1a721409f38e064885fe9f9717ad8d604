const ZipEntry = require("./zipEntry");
const Headers = require("./headers");
const Utils = require("./util");

module.exports = function (/*Buffer|null*/ inBuffer, /** object */ options) {
    var entryList = [],
        entryTable = {},
        _comment = Buffer.alloc(0),
        mainHeader = new Headers.MainHeader(),
        loadedEntries = false;

    // assign options
    const opts = Object.assign(Object.create(null), options);

    const { noSort } = opts;

    if (inBuffer) {
        // is a memory buffer
        readMainHeader(opts.readEntries);
    } else {
        // none. is a new file
        loadedEntries = true;
    }

    function iterateEntries(callback) {
        const totalEntries = mainHeader.diskEntries; // total number of entries
        let index = mainHeader.offset; // offset of first CEN header

        for (let i = 0; i < totalEntries; i++) {
            let tmp = index;
            const entry = new ZipEntry(inBuffer);

            entry.header = inBuffer.slice(tmp, (tmp += Utils.Constants.CENHDR));
            entry.entryName = inBuffer.slice(tmp, (tmp += entry.header.fileNameLength));

            index += entry.header.entryHeaderSize;

            callback(entry);
        }
    }

    function readEntries() {
        loadedEntries = true;
        entryTable = {};
        entryList = new Array(mainHeader.diskEntries); // total number of entries
        var index = mainHeader.offset; // offset of first CEN header
        for (var i = 0; i < entryList.length; i++) {
            var tmp = index,
                entry = new ZipEntry(inBuffer);
            entry.header = inBuffer.slice(tmp, (tmp += Utils.Constants.CENHDR));

            entry.entryName = inBuffer.slice(tmp, (tmp += entry.header.fileNameLength));

            if (entry.header.extraLength) {
                entry.extra = inBuffer.slice(tmp, (tmp += entry.header.extraLength));
            }

            if (entry.header.commentLength) entry.comment = inBuffer.slice(tmp, tmp + entry.header.commentLength);

            index += entry.header.entryHeaderSize;

            entryList[i] = entry;
            entryTable[entry.entryName] = entry;
        }
    }

    function readMainHeader(/*Boolean*/ readNow) {
        var i = inBuffer.length - Utils.Constants.ENDHDR, // END header size
            max = Math.max(0, i - 0xffff), // 0xFFFF is the max zip file comment length
            n = max,
            endStart = inBuffer.length,
            endOffset = -1, // Start offset of the END header
            commentEnd = 0;

        for (i; i >= n; i--) {
            if (inBuffer[i] !== 0x50) continue; // quick check that the byte is 'P'
            if (inBuffer.readUInt32LE(i) === Utils.Constants.ENDSIG) {
                // "PK\005\006"
                endOffset = i;
                commentEnd = i;
                endStart = i + Utils.Constants.ENDHDR;
                // We already found a regular signature, let's look just a bit further to check if there's any zip64 signature
                n = i - Utils.Constants.END64HDR;
                continue;
            }

            if (inBuffer.readUInt32LE(i) === Utils.Constants.END64SIG) {
                // Found a zip64 signature, let's continue reading the whole zip64 record
                n = max;
                continue;
            }

            if (inBuffer.readUInt32LE(i) === Utils.Constants.ZIP64SIG) {
                // Found the zip64 record, let's determine it's size
                endOffset = i;
                endStart = i + Utils.readBigUInt64LE(inBuffer, i + Utils.Constants.ZIP64SIZE) + Utils.Constants.ZIP64LEAD;
                break;
            }
        }

        if (!~endOffset) throw new Error(Utils.Errors.INVALID_FORMAT);

        mainHeader.loadFromBinary(inBuffer.slice(endOffset, endStart));
        if (mainHeader.commentLength) {
            _comment = inBuffer.slice(commentEnd + Utils.Constants.ENDHDR);
        }
        if (readNow) readEntries();
    }

    function sortEntries() {
        if (entryList.length > 1 && !noSort) {
            entryList.sort((a, b) => a.entryName.toLowerCase().localeCompare(b.entryName.toLowerCase()));
        }
    }

    return {
        /**
         * Returns an array of ZipEntry objects existent in the current opened archive
         * @return Array
         */
        get entries() {
            if (!loadedEntries) {
                readEntries();
            }
            return entryList;
        },

        /**
         * Archive comment
         * @return {String}
         */
        get comment() {
            return _comment.toString();
        },
        set comment(val) {
            _comment = Utils.toBuffer(val);
            mainHeader.commentLength = _comment.length;
        },

        getEntryCount: function () {
            if (!loadedEntries) {
                return mainHeader.diskEntries;
            }

            return entryList.length;
        },

        forEach: function (callback) {
            if (!loadedEntries) {
                iterateEntries(callback);
                return;
            }

            entryList.forEach(callback);
        },

        /**
         * Returns a reference to the entry with the given name or null if entry is inexistent
         *
         * @param entryName
         * @return ZipEntry
         */
        getEntry: function (/*String*/ entryName) {
            if (!loadedEntries) {
                readEntries();
            }
            return entryTable[entryName] || null;
        },

        /**
         * Adds the given entry to the entry list
         *
         * @param entry
         */
        setEntry: function (/*ZipEntry*/ entry) {
            if (!loadedEntries) {
                readEntries();
            }
            entryList.push(entry);
            entryTable[entry.entryName] = entry;
            mainHeader.totalEntries = entryList.length;
        },

        /**
         * Removes the entry with the given name from the entry list.
         *
         * If the entry is a directory, then all nested files and directories will be removed
         * @param entryName
         */
        deleteEntry: function (/*String*/ entryName) {
            if (!loadedEntries) {
                readEntries();
            }
            var entry = entryTable[entryName];
            if (entry && entry.isDirectory) {
                var _self = this;
                this.getEntryChildren(entry).forEach(function (child) {
                    if (child.entryName !== entryName) {
                        _self.deleteEntry(child.entryName);
                    }
                });
            }
            entryList.splice(entryList.indexOf(entry), 1);
            delete entryTable[entryName];
            mainHeader.totalEntries = entryList.length;
        },

        /**
         *  Iterates and returns all nested files and directories of the given entry
         *
         * @param entry
         * @return Array
         */
        getEntryChildren: function (/*ZipEntry*/ entry) {
            if (!loadedEntries) {
                readEntries();
            }
            if (entry && entry.isDirectory) {
                const list = [];
                const name = entry.entryName;
                const len = name.length;

                entryList.forEach(function (zipEntry) {
                    if (zipEntry.entryName.substr(0, len) === name) {
                        list.push(zipEntry);
                    }
                });
                return list;
            }
            return [];
        },

        /**
         * Returns the zip file
         *
         * @return Buffer
         */
        compressToBuffer: function () {
            if (!loadedEntries) {
                readEntries();
            }
            sortEntries();

            const dataBlock = [];
            const entryHeaders = [];
            let totalSize = 0;
            let dindex = 0;

            mainHeader.size = 0;
            mainHeader.offset = 0;

            for (const entry of entryList) {
                // compress data and set local and entry header accordingly. Reason why is called first
                const compressedData = entry.getCompressedData();
                // 1. construct data header
                entry.header.offset = dindex;
                const dataHeader = entry.header.dataHeaderToBinary();
                const entryNameLen = entry.rawEntryName.length;
                // 1.2. postheader - data after data header
                const postHeader = Buffer.alloc(entryNameLen + entry.extra.length);
                entry.rawEntryName.copy(postHeader, 0);
                postHeader.copy(entry.extra, entryNameLen);

                // 2. offsets
                const dataLength = dataHeader.length + postHeader.length + compressedData.length;
                dindex += dataLength;

                // 3. store values in sequence
                dataBlock.push(dataHeader);
                dataBlock.push(postHeader);
                dataBlock.push(compressedData);

                // 4. construct entry header
                const entryHeader = entry.packHeader();
                entryHeaders.push(entryHeader);
                // 5. update main header
                mainHeader.size += entryHeader.length;
                totalSize += dataLength + entryHeader.length;
            }

            totalSize += mainHeader.mainHeaderSize; // also includes zip file comment length
            // point to end of data and beginning of central directory first record
            mainHeader.offset = dindex;

            dindex = 0;
            const outBuffer = Buffer.alloc(totalSize);
            // write data blocks
            for (const content of dataBlock) {
                content.copy(outBuffer, dindex);
                dindex += content.length;
            }

            // write central directory entries
            for (const content of entryHeaders) {
                content.copy(outBuffer, dindex);
                dindex += content.length;
            }

            // write main header
            const mh = mainHeader.toBinary();
            if (_comment) {
                _comment.copy(mh, Utils.Constants.ENDHDR); // add zip file comment
            }
            mh.copy(outBuffer, dindex);

            return outBuffer;
        },

        toAsyncBuffer: function (/*Function*/ onSuccess, /*Function*/ onFail, /*Function*/ onItemStart, /*Function*/ onItemEnd) {
            try {
                if (!loadedEntries) {
                    readEntries();
                }
                sortEntries();

                const dataBlock = [];
                const entryHeaders = [];
                let totalSize = 0;
                let dindex = 0;

                mainHeader.size = 0;
                mainHeader.offset = 0;

                const compress2Buffer = function (entryLists) {
                    if (entryLists.length) {
                        const entry = entryLists.pop();
                        const name = entry.entryName + entry.extra.toString();
                        if (onItemStart) onItemStart(name);
                        entry.getCompressedDataAsync(function (compressedData) {
                            if (onItemEnd) onItemEnd(name);

                            entry.header.offset = dindex;
                            // data header
                            const dataHeader = entry.header.dataHeaderToBinary();
                            const postHeader = Buffer.alloc(name.length, name);
                            const dataLength = dataHeader.length + postHeader.length + compressedData.length;

                            dindex += dataLength;

                            dataBlock.push(dataHeader);
                            dataBlock.push(postHeader);
                            dataBlock.push(compressedData);

                            const entryHeader = entry.packHeader();
                            entryHeaders.push(entryHeader);
                            mainHeader.size += entryHeader.length;
                            totalSize += dataLength + entryHeader.length;

                            compress2Buffer(entryLists);
                        });
                    } else {
                        totalSize += mainHeader.mainHeaderSize; // also includes zip file comment length
                        // point to end of data and beginning of central directory first record
                        mainHeader.offset = dindex;

                        dindex = 0;
                        const outBuffer = Buffer.alloc(totalSize);
                        dataBlock.forEach(function (content) {
                            content.copy(outBuffer, dindex); // write data blocks
                            dindex += content.length;
                        });
                        entryHeaders.forEach(function (content) {
                            content.copy(outBuffer, dindex); // write central directory entries
                            dindex += content.length;
                        });

                        const mh = mainHeader.toBinary();
                        if (_comment) {
                            _comment.copy(mh, Utils.Constants.ENDHDR); // add zip file comment
                        }

                        mh.copy(outBuffer, dindex); // write main header

                        onSuccess(outBuffer);
                    }
                };

                compress2Buffer(entryList);
            } catch (e) {
                onFail(e);
            }
        }
    };
};
