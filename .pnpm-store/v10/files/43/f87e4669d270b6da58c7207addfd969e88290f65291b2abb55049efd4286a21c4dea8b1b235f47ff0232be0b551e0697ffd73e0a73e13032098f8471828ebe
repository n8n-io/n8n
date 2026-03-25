export default class BufferList {
  constructor(public buffers: Buffer[] = []) {}

  public add(buffer: Buffer, front?: boolean) {
    this.buffers[front ? 'unshift' : 'push'](buffer)
    return this
  }

  public addInt16(val: number, front?: boolean) {
    return this.add(Buffer.from([val >>> 8, val >>> 0]), front)
  }

  public getByteLength() {
    return this.buffers.reduce(function (previous, current) {
      return previous + current.length
    }, 0)
  }

  public addInt32(val: number, first?: boolean) {
    return this.add(
      Buffer.from([(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, (val >>> 0) & 0xff]),
      first
    )
  }

  public addCString(val: string, front?: boolean) {
    const len = Buffer.byteLength(val)
    const buffer = Buffer.alloc(len + 1)
    buffer.write(val)
    buffer[len] = 0
    return this.add(buffer, front)
  }

  public addString(val: string, front?: boolean) {
    const len = Buffer.byteLength(val)
    const buffer = Buffer.alloc(len)
    buffer.write(val)
    return this.add(buffer, front)
  }

  public addChar(char: string, first?: boolean) {
    return this.add(Buffer.from(char, 'utf8'), first)
  }

  public addByte(byte: number) {
    return this.add(Buffer.from([byte]))
  }

  public join(appendLength?: boolean, char?: string): Buffer {
    let length = this.getByteLength()
    if (appendLength) {
      this.addInt32(length + 4, true)
      return this.join(false, char)
    }
    if (char) {
      this.addChar(char, true)
      length++
    }
    const result = Buffer.alloc(length)
    let index = 0
    this.buffers.forEach(function (buffer) {
      buffer.copy(result, index, 0)
      index += buffer.length
    })
    return result
  }
}
