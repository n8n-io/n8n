const Constants = {
  space: 32,
  tab: 9
}
export default class BufferSource{
  constructor(bytesArr){
    this.line = 1;
    this.cols = 0;
    this.buffer = bytesArr;
    this.startIndex = 0;
  }



  readCh() {
    return String.fromCharCode(this.buffer[this.startIndex++]);
  }

  readChAt(index) {
    return String.fromCharCode(this.buffer[this.startIndex+index]);
  }

  readStr(n,from){
    if(typeof from === "undefined") from = this.startIndex;
    return this.buffer.slice(from, from + n).toString();
  }

  readUpto(stopStr) {
    const inputLength = this.buffer.length;
    const stopLength = stopStr.length;
    const stopBuffer = Buffer.from(stopStr);

    for (let i = this.startIndex; i < inputLength; i++) {
        let match = true;
        for (let j = 0; j < stopLength; j++) {
            if (this.buffer[i + j] !== stopBuffer[j]) {
                match = false;
                break;
            }
        }

        if (match) {
            const result = this.buffer.slice(this.startIndex, i).toString();
            this.startIndex = i + stopLength;
            return result;
        }
    }

    throw new Error(`Unexpected end of source. Reading '${stopStr}'`);
}

readUptoCloseTag(stopStr) { //stopStr: "</tagname"
    const inputLength = this.buffer.length;
    const stopLength = stopStr.length;
    const stopBuffer = Buffer.from(stopStr);
    let stopIndex = 0;
    //0: non-matching, 1: matching stop string, 2: matching closing
    let match = 0;

    for (let i = this.startIndex; i < inputLength; i++) {
        if(match === 1){//initial part matched
            if(stopIndex === 0) stopIndex = i;
            if(this.buffer[i] === Constants.space || this.buffer[i] === Constants.tab) continue;
            else if(this.buffer[i] === '>'){ //TODO: if it should be equivalent ASCII
                match = 2;
                //tag boundary found
                // this.startIndex
            }
        }else{
            match = 1;
            for (let j = 0; j < stopLength; j++) {
                if (this.buffer[i + j] !== stopBuffer[j]) {
                    match = 0;
                    break;
                }
            }
        }
        if (match === 2) {//matched closing part
            const result = this.buffer.slice(this.startIndex, stopIndex - 1 ).toString();
            this.startIndex = i + 1;
            return result;
        }
    }

    throw new Error(`Unexpected end of source. Reading '${stopStr}'`);
}

  readFromBuffer(n, shouldUpdate) {
    let ch;
    if (n === 1) {
      ch = this.buffer[this.startIndex];
      if (ch === 10) {
        this.line++;
        this.cols = 1;
      } else {
        this.cols++;
      }
      ch = String.fromCharCode(ch);
    } else {
      this.cols += n;
      ch = this.buffer.slice(this.startIndex, this.startIndex + n).toString();
    }
    if (shouldUpdate) this.updateBuffer(n);
    return ch;
  }

  updateBufferBoundary(n = 1) { //n: number of characters read
    this.startIndex += n;
  }

  canRead(n){
    n = n || this.startIndex;
    return this.buffer.length - n + 1 > 0;
  }
  
}
