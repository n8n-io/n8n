const whiteSpaces = [" ", "\n", "\t"];


export default class StringSource{
  constructor(str){
    this.line = 1;
    this.cols = 0;
    this.buffer = str;
    //a boundary pointer to indicate where from the buffer dat should be read
    // data before this pointer can be deleted to free the memory
    this.startIndex = 0;
  }

  readCh() {
    return this.buffer[this.startIndex++];
  }

  readChAt(index) {
    return this.buffer[this.startIndex+index];
  }

  readStr(n,from){
    if(typeof from === "undefined") from = this.startIndex;
    return this.buffer.substring(from, from + n);
  }

  readUpto(stopStr) {
    const inputLength = this.buffer.length;
    const stopLength = stopStr.length;

    for (let i = this.startIndex; i < inputLength; i++) {
      let match = true;
      for (let j = 0; j < stopLength; j++) {
        if (this.buffer[i + j] !== stopStr[j]) {
          match = false;
          break;
        }
      }

      if (match) {
        const result = this.buffer.substring(this.startIndex, i);
        this.startIndex = i + stopLength;
        return result;
      }
    }

    throw new Error(`Unexpected end of source. Reading '${stopStr}'`);
  }

  readUptoCloseTag(stopStr) { //stopStr: "</tagname"
    const inputLength = this.buffer.length;
    const stopLength = stopStr.length;
    let stopIndex = 0;
    //0: non-matching, 1: matching stop string, 2: matching closing
    let match = 0;

    for (let i = this.startIndex; i < inputLength; i++) {
      if(match === 1){//initial part matched
        if(stopIndex === 0) stopIndex = i;
        if(this.buffer[i] === ' ' || this.buffer[i] === '\t') continue;
        else if(this.buffer[i] === '>'){
          match = 2;
          //tag boundary found
          // this.startIndex
        }
      }else{
        match = 1;
        for (let j = 0; j < stopLength; j++) {
          if (this.buffer[i + j] !== stopStr[j]) {
            match = 0;
            break;
          }
        }
      }
      if (match === 2) {//matched closing part
        const result = this.buffer.substring(this.startIndex, stopIndex - 1 );
        this.startIndex = i + 1;
        return result;
      }
    }

    throw new Error(`Unexpected end of source. Reading '${stopStr}'`);
  }

  readFromBuffer(n, updateIndex){
    let ch;
    if(n===1){
      ch = this.buffer[this.startIndex];
      // if(ch === "\n") {
      //   this.line++;
      //   this.cols = 1;
      // }else{
      //   this.cols++;
      // }
    }else{
      ch = this.buffer.substring(this.startIndex, this.startIndex + n);
      // if("".indexOf("\n") !== -1){
      //   //TODO: handle the scenario when there are multiple lines
      //   //TODO: col should be set to number of chars after last '\n'
      //   // this.cols = 1;
      // }else{
      //   this.cols += n;

      // }
    }
    if(updateIndex) this.updateBufferBoundary(n);
    return ch;
  }

  //TODO: rename to updateBufferReadIndex
  
  updateBufferBoundary(n = 1) { //n: number of characters read
    this.startIndex += n;
  }

  canRead(n){
    n = n || this.startIndex;
    return this.buffer.length - n + 1 > 0;
  }
  
}
