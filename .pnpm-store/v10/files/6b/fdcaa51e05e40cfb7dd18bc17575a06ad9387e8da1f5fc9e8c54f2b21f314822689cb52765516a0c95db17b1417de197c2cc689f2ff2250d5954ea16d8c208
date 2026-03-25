var nub = module.exports = function (xs, cmp) {
    if (typeof xs === 'function' || cmp) {
        return nub.by(xs, cmp);
    }
    
    var keys = {
        'object' : [],
        'function' : [],
        'string' : {},
        'number' : {},
        'boolean' : {},
        'undefined' : {}
    };
    
    var res = [];
    
    for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        var recs = x === '__proto__'
            ? keys.objects
            : keys[typeof x] || keys.objects
        ;
        
        if (Array.isArray(recs)) {
            if (recs.indexOf(x) < 0) {
                recs.push(x);
                res.push(x);
            }
        }
        else if (!Object.hasOwnProperty.call(recs, x)) {
            recs[x] = true;
            res.push(x);
        }
    }
    
    return res;
};

nub.by = function (xs, cmp) {
    if (typeof xs === 'function') {
        var cmp_ = cmp;
        cmp = xs;
        xs = cmp_;
    }
    
    var res = [];
    
    for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        
        var found = false;
        for (var j = 0; j < res.length; j++) {
            var y = res[j];
            if (cmp.call(res, x, y)) {
                found = true;
                break;
            }
        }
        
        if (!found) res.push(x);
    }
    
    return res;
};
