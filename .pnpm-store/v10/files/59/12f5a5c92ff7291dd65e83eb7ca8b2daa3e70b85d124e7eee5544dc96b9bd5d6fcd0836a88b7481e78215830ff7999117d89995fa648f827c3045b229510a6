import {TagPath} from './TagPath.js';

export default class TagPathMatcher{
  constructor(stack,node){
    this.stack = stack;
    this.node= node;
  }

  match(path){
    const tagPath = new TagPath(path);
    return tagPath.match(this.stack, this.node);
  }
}