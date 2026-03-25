'use strict';

// connection mixins
// implementation of http://dev.mysql.com/doc/internals/en/compression.html

const zlib = require('zlib');
const PacketParser = require('./packet_parser.js');

function handleCompressedPacket(packet) {
  // eslint-disable-next-line consistent-this, no-invalid-this
  const connection = this;
  const deflatedLength = packet.readInt24();
  const body = packet.readBuffer();

  if (deflatedLength !== 0) {
    connection.inflateQueue.push((task) => {
      zlib.inflate(body, (err, data) => {
        if (err) {
          connection._handleNetworkError(err);
          return;
        }
        connection._bumpCompressedSequenceId(packet.numPackets);
        connection._inflatedPacketsParser.execute(data);
        task.done();
      });
    });
  } else {
    connection.inflateQueue.push((task) => {
      connection._bumpCompressedSequenceId(packet.numPackets);
      connection._inflatedPacketsParser.execute(body);
      task.done();
    });
  }
}

function writeCompressed(buffer) {
  // http://dev.mysql.com/doc/internals/en/example-several-mysql-packets.html
  // note: sending a MySQL Packet of the size 2^24−5 to 2^24−1 via compression
  // leads to at least one extra compressed packet.
  // (this is because "length of the packet before compression" need to fit
  // into 3 byte unsigned int. "length of the packet before compression" includes
  // 4 byte packet header, hence 2^24−5)
  const MAX_COMPRESSED_LENGTH = 16777210;
  let start;
  if (buffer.length > MAX_COMPRESSED_LENGTH) {
    for (start = 0; start < buffer.length; start += MAX_COMPRESSED_LENGTH) {
      writeCompressed.call(
        // eslint-disable-next-line no-invalid-this
        this,
        buffer.slice(start, start + MAX_COMPRESSED_LENGTH)
      );
    }
    return;
  }

  // eslint-disable-next-line no-invalid-this, consistent-this
  const connection = this;

  let packetLen = buffer.length;
  const compressHeader = Buffer.allocUnsafe(7);

  // seqqueue is used here because zlib async execution is routed via thread pool
  // internally and when we have multiple compressed packets arriving we need
  // to assemble uncompressed result sequentially
  (function (seqId) {
    connection.deflateQueue.push((task) => {
      zlib.deflate(buffer, (err, compressed) => {
        if (err) {
          connection._handleFatalError(err);
          return;
        }
        let compressedLength = compressed.length;

        if (compressedLength < packetLen) {
          compressHeader.writeUInt8(compressedLength & 0xff, 0);
          compressHeader.writeUInt16LE(compressedLength >> 8, 1);
          compressHeader.writeUInt8(seqId, 3);
          compressHeader.writeUInt8(packetLen & 0xff, 4);
          compressHeader.writeUInt16LE(packetLen >> 8, 5);
          connection.writeUncompressed(compressHeader);
          connection.writeUncompressed(compressed);
        } else {
          // http://dev.mysql.com/doc/internals/en/uncompressed-payload.html
          // To send an uncompressed payload:
          //   - set length of payload before compression to 0
          //   - the compressed payload contains the uncompressed payload instead.
          compressedLength = packetLen;
          packetLen = 0;
          compressHeader.writeUInt8(compressedLength & 0xff, 0);
          compressHeader.writeUInt16LE(compressedLength >> 8, 1);
          compressHeader.writeUInt8(seqId, 3);
          compressHeader.writeUInt8(packetLen & 0xff, 4);
          compressHeader.writeUInt16LE(packetLen >> 8, 5);
          connection.writeUncompressed(compressHeader);
          connection.writeUncompressed(buffer);
        }
        task.done();
      });
    });
  })(connection.compressedSequenceId);
  connection._bumpCompressedSequenceId(1);
}

function enableCompression(connection) {
  connection._lastWrittenPacketId = 0;
  connection._lastReceivedPacketId = 0;

  connection._handleCompressedPacket = handleCompressedPacket;
  connection._inflatedPacketsParser = new PacketParser((p) => {
    connection.handlePacket(p);
  }, 4);
  connection._inflatedPacketsParser._lastPacket = 0;
  connection.packetParser = new PacketParser((packet) => {
    connection._handleCompressedPacket(packet);
  }, 7);

  connection.writeUncompressed = connection.write;
  connection.write = writeCompressed;

  const seqqueue = require('seq-queue');
  connection.inflateQueue = seqqueue.createQueue();
  connection.deflateQueue = seqqueue.createQueue();
}

module.exports = {
  enableCompression: enableCompression,
};
