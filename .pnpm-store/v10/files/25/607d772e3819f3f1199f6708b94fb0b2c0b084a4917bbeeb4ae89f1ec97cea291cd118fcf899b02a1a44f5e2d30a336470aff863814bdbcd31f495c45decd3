import toNumber from "strnum";


export default class numParser{
    constructor(options){
        this.options = options;
    }
    parse(val){
        if (typeof val === 'string') {
            val = toNumber(val,this.options);
        }
        return val;
    }
}
