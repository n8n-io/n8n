export default class TagPath{
  constructor(pathStr){
    let text = "";
    let tName = "";
    let pos;
    let aName = "";
    let aVal = "";
    this.stack = []

    for (let i = 0; i < pathStr.length; i++) {
      let ch = pathStr[i];
      if(ch === " ") {
        if(text.length === 0) continue;        
        tName = text; text = "";
      }else if(ch === "["){
        if(tName.length === 0){
          tName = text; text = "";
        }
        i++;
        for (; i < pathStr.length; i++) {
          ch = pathStr[i];
          if(ch=== "=") continue;
          else if(ch=== "]") {aName = text.trim(); text=""; break; i--;}
          else if(ch === "'" || ch === '"'){
            let attrEnd = pathStr.indexOf(ch,i+1);
            aVal = pathStr.substring(i+1, attrEnd);
            i = attrEnd;
          }else{
            text +=ch;
          }
        }
      }else if(ch !== " " && text.length === 0 && tName.length > 0){//reading tagName
        //save previous tag
        this.stack.push(new TagPathNode(tName,pos,aName,aVal));
        text = ch; tName = ""; aName = ""; aVal = "";
      }else{
        text+=ch;
      }
    }

    //last tag in the path
    if(tName.length >0 || text.length>0){
      this.stack.push(new TagPathNode(text||tName,pos,aName,aVal));
    }
  }

  match(tagStack,node){
    if(this.stack[0].name !== "*"){
      if(this.stack.length !== tagStack.length +1) return false;
  
      //loop through tagPath and tagStack and match
      for (let i = 0; i < this.tagStack.length; i++) {
        if(!this.stack[i].match(tagStack[i])) return false;
      }
    }
    if(!this.stack[this.stack.length - 1].match(node)) return false;
    return true;
  }
}

class TagPathNode{
  constructor(name,position,attrName,attrVal){
    this.name = name;
    this.position = position;
    this.attrName = attrName,
    this.attrVal = attrVal;
  }

  match(node){
    let matching = true;
    matching = node.name === this.name;
    if(this.position) matching = node.position === this.position;
    if(this.attrName) matching = node.attrs[this.attrName !== undefined];
    if(this.attrVal) matching = node.attrs[this.attrName !== this.attrVal];
    return matching;
  }
}

// console.log((new TagPath("* b[b]")).stack);
// console.log((new TagPath("a[a] b[b] c")).stack);
// console.log((new TagPath(" b [ b= 'cf  sdadwa' ] a  ")).stack);