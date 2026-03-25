'use strict';

const Packet = require('./packets/packet.js');

const MAX_PACKET_LENGTH = 16777215;

function readPacketLength(b, off) {
  const b0 = b[off];
  const b1 = b[off + 1];
  const b2 = b[off + 2];
  if (b1 + b2 === 0) {
    return b0;
  }
  return b0 + (b1 << 8) + (b2 << 16);
}

class PacketParser {
  constructor(onPacket, packetHeaderLength) {
    // 4 for normal packets, 7 for comprssed protocol packets
    if (typeof packetHeaderLength === 'undefined') {
      packetHeaderLength = 4;
    }
    // array of last payload chunks
    // only used when current payload is not complete
    this.buffer = [];
    // total length of chunks on buffer
    this.bufferLength = 0;
    this.packetHeaderLength = packetHeaderLength;
    // incomplete header state: number of header bytes received
    this.headerLen = 0;
    // expected payload length
    this.length = 0;
    this.largePacketParts = [];
    this.firstPacketSequenceId = 0;
    this.onPacket = onPacket;
    this.execute = PacketParser.prototype.executeStart;
    this._flushLargePacket =
      packetHeaderLength === 7
        ? this._flushLargePacket7
        : this._flushLargePacket4;
  }

  _flushLargePacket4() {
    const numPackets = this.largePacketParts.length;
    this.largePacketParts.unshift(Buffer.from([0, 0, 0, 0])); // insert header
    const body = Buffer.concat(this.largePacketParts);
    const packet = new Packet(this.firstPacketSequenceId, body, 0, body.length);
    this.largePacketParts.length = 0;
    packet.numPackets = numPackets;
    this.onPacket(packet);
  }

  _flushLargePacket7() {
    const numPackets = this.largePacketParts.length;
    this.largePacketParts.unshift(Buffer.from([0, 0, 0, 0, 0, 0, 0])); // insert header
    const body = Buffer.concat(this.largePacketParts);
    this.largePacketParts.length = 0;
    const packet = new Packet(this.firstPacketSequenceId, body, 0, body.length);
    packet.numPackets = numPackets;
    this.onPacket(packet);
  }

  executeStart(chunk) {
    let start = 0;
    const end = chunk.length;
    while (end - start >= 3) {
      this.length = readPacketLength(chunk, start);
      if (end - start >= this.length + this.packetHeaderLength) {
        // at least one full packet
        const sequenceId = chunk[start + 3];
        if (
          this.length < MAX_PACKET_LENGTH &&
          this.largePacketParts.length === 0
        ) {
          this.onPacket(
            new Packet(
              sequenceId,
              chunk,
              start,
              start + this.packetHeaderLength + this.length
            )
          );
        } else {
          // first large packet - remember it's id
          if (this.largePacketParts.length === 0) {
            this.firstPacketSequenceId = sequenceId;
          }
          this.largePacketParts.push(
            chunk.slice(
              start + this.packetHeaderLength,
              start + this.packetHeaderLength + this.length
            )
          );
          if (this.length < MAX_PACKET_LENGTH) {
            this._flushLargePacket();
          }
        }
        start += this.packetHeaderLength + this.length;
      } else {
        // payload is incomplete
        this.buffer = [chunk.slice(start + 3, end)];
        this.bufferLength = end - start - 3;
        this.execute = PacketParser.prototype.executePayload;
        return;
      }
    }
    if (end - start > 0) {
      // there is start of length header, but it's not full 3 bytes
      this.headerLen = end - start; // 1 or 2 bytes
      this.length = chunk[start];
      if (this.headerLen === 2) {
        this.length = chunk[start] + (chunk[start + 1] << 8);
        this.execute = PacketParser.prototype.executeHeader3;
      } else {
        this.execute = PacketParser.prototype.executeHeader2;
      }
    }
  }

  executePayload(chunk) {
    let start = 0;
    const end = chunk.length;
    const remainingPayload =
      this.length - this.bufferLength + this.packetHeaderLength - 3;
    if (end - start >= remainingPayload) {
      // last chunk for payload
      const payload = Buffer.allocUnsafe(this.length + this.packetHeaderLength);
      let offset = 3;
      for (let i = 0; i < this.buffer.length; ++i) {
        this.buffer[i].copy(payload, offset);
        offset += this.buffer[i].length;
      }
      chunk.copy(payload, offset, start, start + remainingPayload);
      const sequenceId = payload[3];
      if (
        this.length < MAX_PACKET_LENGTH &&
        this.largePacketParts.length === 0
      ) {
        this.onPacket(
          new Packet(
            sequenceId,
            payload,
            0,
            this.length + this.packetHeaderLength
          )
        );
      } else {
        // first large packet - remember it's id
        if (this.largePacketParts.length === 0) {
          this.firstPacketSequenceId = sequenceId;
        }
        this.largePacketParts.push(
          payload.slice(
            this.packetHeaderLength,
            this.packetHeaderLength + this.length
          )
        );
        if (this.length < MAX_PACKET_LENGTH) {
          this._flushLargePacket();
        }
      }
      this.buffer = [];
      this.bufferLength = 0;
      this.execute = PacketParser.prototype.executeStart;
      start += remainingPayload;
      if (end - start > 0) {
        return this.execute(chunk.slice(start, end));
      }
    } else {
      this.buffer.push(chunk);
      this.bufferLength += chunk.length;
    }
    return null;
  }

  executeHeader2(chunk) {
    this.length += chunk[0] << 8;
    if (chunk.length > 1) {
      this.length += chunk[1] << 16;
      this.execute = PacketParser.prototype.executePayload;
      return this.executePayload(chunk.slice(2));
    }
    this.execute = PacketParser.prototype.executeHeader3;

    return null;
  }

  executeHeader3(chunk) {
    this.length += chunk[0] << 16;
    this.execute = PacketParser.prototype.executePayload;
    return this.executePayload(chunk.slice(1));
  }
}

module.exports = PacketParser;
