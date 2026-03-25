export default function boolParserExt(val){
    if(isArray(val)){
        for (let i = 0; i < val.length; i++) {
            val[i] = parse(val[i])
        }
    }else{
        val = parse(val)
    }
    return val;
}

function parse(val){
    if (typeof val === 'string') {
        const temp = val.toLowerCase();
        if(temp === 'true' || temp ==="yes" || temp==="1") return true;
        else if(temp === 'false' || temp ==="no" || temp==="0") return false;
    }
    return val;
}
