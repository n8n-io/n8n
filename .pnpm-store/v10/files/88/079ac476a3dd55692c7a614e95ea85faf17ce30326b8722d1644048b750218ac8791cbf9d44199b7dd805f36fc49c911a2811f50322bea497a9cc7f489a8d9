export default class boolParser{
    constructor(trueList, falseList){
        if(trueList)
            this.trueList = trueList;
        else
            this.trueList = ["true"];
        
        if(falseList)
            this.falseList = falseList;
        else
            this.falseList = ["false"];
    }
    parse(val){
        if (typeof val === 'string') {
            //TODO: performance: don't convert
            const temp = val.toLowerCase();
            if(this.trueList.indexOf(temp) !== -1) return true;
            else if(this.falseList.indexOf(temp) !== -1 ) return false;
        }
        return val;
    }
}
