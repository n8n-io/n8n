
class ResizeableBuffer{
  constructor(size=100){
    this.size = size;
    this.length = 0;
    this.buf = Buffer.allocUnsafe(size);
  }
  prepend(val){
    if(Buffer.isBuffer(val)){
      const length = this.length + val.length;
      if(length >= this.size){
        this.resize();
        if(length >= this.size){
          throw Error('INVALID_BUFFER_STATE');
        }
      }
      const buf = this.buf;
      this.buf = Buffer.allocUnsafe(this.size);
      val.copy(this.buf, 0);
      buf.copy(this.buf, val.length);
      this.length += val.length;
    }else{
      const length = this.length++;
      if(length === this.size){
        this.resize();
      }
      const buf = this.clone();
      this.buf[0] = val;
      buf.copy(this.buf,1, 0, length);
    }
  }
  append(val){
    const length = this.length++;
    if(length === this.size){
      this.resize();
    }
    this.buf[length] = val;
  }
  clone(){
    return Buffer.from(this.buf.slice(0, this.length));
  }
  resize(){
    const length = this.length;
    this.size = this.size * 2;
    const buf = Buffer.allocUnsafe(this.size);
    this.buf.copy(buf,0, 0, length);
    this.buf = buf;
  }
  toString(encoding){
    if(encoding){
      return this.buf.slice(0, this.length).toString(encoding);
    }else{
      return Uint8Array.prototype.slice.call(this.buf.slice(0, this.length));
    }
  }
  toJSON(){
    return this.toString('utf8');
  }
  reset(){
    this.length = 0;
  }
}

export default ResizeableBuffer;
